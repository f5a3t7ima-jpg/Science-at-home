"""Create browser copies; retain geometry, rigs and every supplied animation."""
from pathlib import Path
from PIL import Image
import io, json, struct, hashlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'upload'
MODELS = {
    'hessa': 'Meshy_AI_Hessa_All_Animations.glb',
    'hamad': 'Meshy_AI_Hamad_All_Animations (1).glb',
    'mother': 'Meshy_AI_Mother_Character_Desi_All_Animations.glb',
    'father': 'Meshy_AI_Khalid_—_Father_All_Animations.glb',
    'grandma': 'Meshy_AI_Golden_Veil_Grandma_All_Animations (2).glb',
    'grandpa': 'Meshy_AI_Grandfather_Character_All_Animations (2).glb',
    'fahem': 'Meshy_AI_Fahem_the_Friendly_Ec_All_Animations (1).glb',
    'shaheen': 'Meshy_AI_Character_output (1).glb',
    'maha': 'Meshy_AI_Maha_quadruped_Character_output.glb',
    'maha-walking': 'Meshy_AI_Maha_quadruped_model_Animation_Walking_withSkin.glb',
}

def optimize(key, name):
    raw = (SOURCE / name).read_bytes()
    n = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+n])
    binary = raw[28+n:]
    images = {im['bufferView']: im for im in doc['images']}
    out = bytearray()
    for index, view in enumerate(doc['bufferViews']):
        start = view.get('byteOffset', 0)
        chunk = binary[start:start+view['byteLength']]
        if index in images:
            im = images[index]
            pic = Image.open(io.BytesIO(chunk)).convert('RGB')
            size = 1024 if im.get('name') == 'texture_0' else 512
            pic.thumbnail((size, size), Image.Resampling.LANCZOS)
            stream = io.BytesIO()
            pic.save(stream, format='JPEG', quality=88, optimize=True, subsampling=0)
            chunk = stream.getvalue()
            im['mimeType'] = 'image/jpeg'
        # All non-image bytes remain exactly as supplied, including animation data.
        while len(out) % 4: out.append(0)
        view['byteOffset'] = len(out)
        view['byteLength'] = len(chunk)
        out.extend(chunk)
    while len(out) % 4: out.append(0)
    doc['buffers'][0]['byteLength'] = len(out)
    j = json.dumps(doc, separators=(',', ':')).encode()
    j += b' ' * (-len(j) % 4)
    result = struct.pack('<III', 0x46546c67, 2, 28+len(j)+len(out))
    result += struct.pack('<II', len(j), 0x4e4f534a) + j
    result += struct.pack('<II', len(out), 0x004e4942) + out
    (ROOT / 'assets/models' / (key+'.glb')).write_bytes(result)
    return {'model': key, 'source': name, 'sourceBytes': len(raw), 'gameBytes': len(result),
            'sourceSHA256': hashlib.sha256(raw).hexdigest(),
            'animations': [a.get('name') for a in doc.get('animations', [])]}

if __name__ == '__main__':
    report = [optimize(k, v) for k, v in MODELS.items()]
    (ROOT / 'tools/model-manifest.json').write_text(json.dumps(report, indent=2)+'\n')
    for r in report: print(r['model'], round(r['sourceBytes']/1048576, 2), '->', round(r['gameBytes']/1048576, 2), 'MB')
