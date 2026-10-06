"""Bundle the game and its supplied models into one double-clickable HTML file."""
from pathlib import Path
import base64, json, re
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'deliverables';OUT.mkdir(exist_ok=True)
def read(path):return (ROOT/path).read_text()
def script(text):return '<script>'+text.replace('</script','<\\/script')+'</script>'
def export_object(body):
 entries=[]
 for term in body.split(','):
  term=term.strip()
  if not term:continue
  pair=term.split(' as ');entries.append((pair[-1]+':'+pair[0]) if len(pair)==2 else term)
 return '{'+','.join(entries)+'}'
def imports(text):
 return re.sub(r"import\s*\{(.*?)\}\s*from\s*'([^']+)';",lambda m:'const {'+m.group(1)+'} = '+('window.CharacterTHREE' if 'three.module' in m.group(2) else 'window.CharacterGeometryUtils')+';',text,flags=re.S)
three=read('vendor/three.module.js')
three=re.sub(r'export\s*\{([^}]+)\};?\s*$',lambda m:'window.CharacterTHREE='+export_object(m.group(1))+';',three)
utils=imports(read('vendor/BufferGeometryUtils.js'))
utils=re.sub(r'export\s*\{([^}]+)\};?\s*$',lambda m:'window.CharacterGeometryUtils='+export_object(m.group(1))+';',utils)
loader=imports(read('vendor/GLTFLoader.js')).replace('export { GLTFLoader };','window.CharacterGLTFLoader=GLTFLoader;')
characters=read('assets/characters.js')
characters=re.sub(r"import \* as THREE from '[^']+';",'const THREE=window.CharacterTHREE;',characters)
characters=re.sub(r"import \{ GLTFLoader \} from '[^']+';",'const GLTFLoader=window.CharacterGLTFLoader;',characters)
characters=re.sub(r"    const response = await fetch\(.*?return loader.parseAsync\(await response.arrayBuffer\(\), ''\);", "    const bytes=Uint8Array.from(atob(window.__CHARACTER_GLBS[name]),c=>c.charCodeAt(0));\n    return loader.parseAsync(bytes.buffer,'');",characters,flags=re.S)
characters=characters.replace('export { loadAll, prepareScene, update };','')
models={name:base64.b64encode((ROOT/'assets/models'/(name+'.glb')).read_bytes()).decode() for name in ['hessa','hamad','mother','father','grandma','grandpa']}
portraits={name:'data:image/png;base64,'+base64.b64encode((ROOT/'assets/helpers'/(name+'.png')).read_bytes()).decode() for name in ['shaheen','fahem','maha','hessa','hamad']}
ui=read('assets/updates.js').replace('src="assets/helpers/${name}.png"','src="${window.__HELPER_IMAGES[name]}"')
for name in ['hessa','hamad']:ui=ui.replace('src="assets/helpers/'+name+'.png"','src="'+portraits[name]+'"')
charter={f.stem:'data:image/png;base64,'+base64.b64encode(f.read_bytes()).decode() for f in (ROOT/'assets/charter').glob('*.png')}
ui=ui.replace('src="assets/charter/${id}.png"','src="${window.__CHARTER_IMAGES[id]}"').replace('src="assets/charter/charter-mark.png"','src="${window.__CHARTER_IMAGES[\'charter-mark\']}"')
game=read('assets/game.js').replace("Characters load from this game's assets.", 'Characters are included in this file.')
html=read('index.html')
html=html.replace('<link rel="stylesheet" href="assets/updates.css">','<style>'+read('assets/updates.css')+'</style>')
html=html.replace('<script>window.CharacterModelsReady=import("./assets/characters.js").catch(error=>{console.error("Character loader:",error);return null});</script>','')
for name,body in [('photo-data.js',read('assets/photo-data.js')),('voice-data.js',read('assets/voice-data.js')),('voice-updates.js',read('assets/voice-updates.js')),('updates.js',ui),('game.js',game)]:
 html=html.replace(f'<script src="assets/{name}"></script>',script(body))
resources=script('window.__CHARACTER_GLBS='+json.dumps(models,separators=(',',':'))+';window.__HELPER_IMAGES='+json.dumps(portraits,separators=(',',':'))+';window.__CHARTER_IMAGES='+json.dumps(charter,separators=(',',':'))+';')
resources+=''.join(script('(()=>{'+body+'\n})();') for body in [three,utils,loader,characters])+script('window.CharacterModelsReady=Promise.resolve();')
html=html.replace('</head>',resources+'</head>')
out=OUT/'Science_at_Home_V8_8.html';out.write_text(html)
assert not re.search(r'<(?:script[^>]*src|link[^>]*href)=',html)
for i,m in enumerate(re.finditer(r'<script[^>]*>(.*?)</script>',html,re.S)):
 Path('/tmp/offline-script-'+str(i)+'.js').write_text(m.group(1))
print(out,round(out.stat().st_size/1048576,2),'MiB')
