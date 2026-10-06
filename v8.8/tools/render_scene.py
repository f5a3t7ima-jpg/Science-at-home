"""Render the real game scene exported by world-check.mjs through software EGL."""
from pathlib import Path
import sys
base=Path(__file__).with_name('render_portraits.py').read_text()
exec(base[:base.index('def read_glb')].replace('width,height=600,700','width,height=1366,768'))

def render_scene(name):
 folder=ROOT/'review'/name;doc=json.loads((folder/'scene.json').read_text());binary=(folder/'geometry.bin').read_bytes()
 def arr(info,dtype,dim):return np.frombuffer(binary,dtype=dtype,count=info['length'],offset=info['offset']).reshape(-1,dim)
 viewport(0,0,width,height);bg=doc['background'];clearcolor(*[int(bg[i:i+2],16)/255 for i in (0,2,4)],1);clear(0x4000|0x100);enable(0x0B71);enable(0x0BA1);disable(0x0B44)
 matrixmode(0x1701);mat(np.array(doc['projection']).reshape(4,4).T);matrixmode(0x1700);mat(np.array(doc['camera']).reshape(4,4).T)
 enable(0x0B50);enable(0x4000);enable(0x4001)
 light(0x4000,0x1203,fv([-17,28,18,0]));light(0x4000,0x1201,fv([.72,.69,.62,1]));light(0x4000,0x1200,fv([.45,.43,.40,1]));light(0x4001,0x1203,fv([5,9,-3,0]));light(0x4001,0x1201,fv([.3,.3,.3,1]))
 enableclient(0x8074);enableclient(0x8075);enableclient(0x8078)
 texcache={}
 for entry in doc['entries']:
  pos=np.ascontiguousarray(arr(entry['position'],'<f4',3));indices=np.ascontiguousarray(arr(entry['index'],'<u4',1).ravel());uv=np.ascontiguousarray(arr(entry['uv'],'<f4',2)*entry['repeat'],dtype='float32')
  tris=indices.reshape(-1,3);a=pos[tris[:,1]]-pos[tris[:,0]];b=pos[tris[:,2]]-pos[tris[:,0]];face=np.cross(a,b);norm=np.zeros_like(pos)
  for k in range(3):np.add.at(norm,tris[:,k],face)
  norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-12);norm=np.ascontiguousarray(norm,dtype='float32')
  color=[int(entry['color'][i:i+2],16)/255 for i in (0,2,4)];material(0x0408,0x1602,fv([*color,1]))
  if entry['texture']:
   enable(0x0DE1);key=(entry['texture'],entry['flipY'])
   if key not in texcache:
    pic=Image.open(folder/entry['texture']).convert('RGBA');pixels=np.asarray(pic,dtype='uint8');pixels=np.ascontiguousarray(pixels[::-1] if entry['flipY'] else pixels);tex=ui();gentex(1,C.byref(tex));bindtex(0x0DE1,tex);texparam(0x0DE1,0x2801,0x2601);texparam(0x0DE1,0x2800,0x2601);teximage(0x0DE1,0,0x1908,pic.width,pic.height,0,0x1908,0x1401,pixels.ctypes.data);texcache[key]=tex
   bindtex(0x0DE1,texcache[key])
  else:disable(0x0DE1)
  vertexptr(3,0x1406,0,pos.ctypes.data);normalptr(0x1406,0,norm.ctypes.data);uvptr(2,0x1406,0,uv.ctypes.data);draw(4,len(indices),0x1405,indices.ctypes.data)
 rgba=np.empty((height,width,4),dtype='uint8');readpixels(0,0,width,height,0x1908,0x1401,rgba.ctypes.data);Image.fromarray(rgba[::-1]).convert('RGB').save(ROOT/'screenshots'/(name+'.jpg'),quality=94)
 print('Rendered',name)
for name in sys.argv[1:] or ['majlis-seating','hessa-reply','marshmallow-handover']:render_scene(name)
