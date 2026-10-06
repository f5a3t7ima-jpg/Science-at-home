"""Render supplied GLBs using a software OpenGL context (no browser/GPU needed)."""
import ctypes as C
import io, json, struct
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
E = C.CDLL('libEGL.so.1'); G = C.CDLL('libGL.so.1')
E.eglGetProcAddress.argtypes=[C.c_char_p]; E.eglGetProcAddress.restype=C.c_void_p
get_display=C.CFUNCTYPE(C.c_void_p,C.c_uint,C.c_void_p,C.POINTER(C.c_int))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display=get_display(0x31DD,None,None)
E.eglInitialize.argtypes=[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)]
major=C.c_int();minor=C.c_int();assert E.eglInitialize(display,C.byref(major),C.byref(minor))
E.eglBindAPI.argtypes=[C.c_uint];assert E.eglBindAPI(0x30A2)
attrs=(C.c_int*15)(0x3033,1,0x3040,8,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)
config=C.c_void_p();count=C.c_int()
E.eglChooseConfig.argtypes=[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)]
assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(count)) and count.value
E.eglCreateContext.argtypes=[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)];E.eglCreateContext.restype=C.c_void_p
context=E.eglCreateContext(display,config,None,(C.c_int*1)(0x3038))
E.eglCreatePbufferSurface.argtypes=[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)];E.eglCreatePbufferSurface.restype=C.c_void_p
width,height=600,700
surface=E.eglCreatePbufferSurface(display,config,(C.c_int*5)(0x3057,width,0x3056,height,0x3038))
E.eglMakeCurrent.argtypes=[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p]
assert E.eglMakeCurrent(display,surface,surface,context)
def func(name,args):
 f=getattr(G,name);f.argtypes=args;return f
ui=C.c_uint;ii=C.c_int;fl=C.c_float;dp=C.c_void_p
enable=func('glEnable',[ui]);disable=func('glDisable',[ui]);clear=func('glClear',[ui]);clearcolor=func('glClearColor',[fl]*4)
viewport=func('glViewport',[ii]*4);matrixmode=func('glMatrixMode',[ui]);loadmatrix=func('glLoadMatrixf',[C.POINTER(fl)])
light=func('glLightfv',[ui,ui,C.POINTER(fl)]);material=func('glMaterialfv',[ui,ui,C.POINTER(fl)])
enableclient=func('glEnableClientState',[ui]);vertexptr=func('glVertexPointer',[ii,ui,ii,dp]);normalptr=func('glNormalPointer',[ui,ii,dp]);uvptr=func('glTexCoordPointer',[ii,ui,ii,dp]);draw=func('glDrawElements',[ui,ii,ui,dp])
gentex=func('glGenTextures',[ii,C.POINTER(ui)]);bindtex=func('glBindTexture',[ui,ui]);texparam=func('glTexParameteri',[ui,ui,ii]);teximage=func('glTexImage2D',[ui,ii,ii,ii,ii,ii,ui,ui,dp]);readpixels=func('glReadPixels',[ii,ii,ii,ii,ui,ui,dp])
def fv(v): return (fl*len(v))(*v)
def mat(m): loadmatrix(fv(np.asarray(m).T.ravel()))
def quaternion(q):
 x,y,z,w=q
 return np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w,0],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w,0],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y,0],[0,0,0,1]])
def read_glb(path, animation=None, time=0):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binary=raw[28+n:]
 def accessor(i):
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  return np.frombuffer(binary,dtype=dtype,count=a['count']*n,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n).copy()
 if animation:
  clip=next(a for a in doc.get('animations',[]) if a['name']==animation)
  for channel in clip['channels']:
   sampler=clip['samplers'][channel['sampler']];times=accessor(sampler['input']).ravel();values=accessor(sampler['output']);k=max(0,min(len(times)-2,int(np.searchsorted(times,time))-1));mix=0 if len(times)==1 else float(np.clip((time-times[k])/max(1e-8,times[min(k+1,len(times)-1)]-times[k]),0,1));a=values[k];b=values[min(k+1,len(values)-1)];kind=channel['target']['path']
   if kind=='rotation' and np.dot(a,b)<0:b=-b
   value=a*(1-mix)+b*mix
   if kind=='rotation':value/=np.linalg.norm(value)
   doc['nodes'][channel['target']['node']][kind]=value.tolist()
 transforms={}
 def visit(i,parent):
  node=doc['nodes'][i]
  if 'matrix' in node:m=np.array(node['matrix']).reshape(4,4).T
  else:
   m=quaternion(node.get('rotation',[0,0,0,1]));m[:3,:3]*=node.get('scale',[1,1,1]);m[:3,3]=node.get('translation',[0,0,0])
  transforms[i]=parent@m
  for ch in node.get('children',[]):visit(ch,transforms[i])
 for i in doc['scenes'][doc.get('scene',0)]['nodes']:visit(i,np.eye(4))
 batches=[]
 for i,node in enumerate(doc['nodes']):
  if 'mesh' not in node:continue
  for primitive in doc['meshes'][node['mesh']]['primitives']:
   attr=primitive['attributes'];pos=accessor(attr['POSITION']);norm=accessor(attr['NORMAL']);uv=accessor(attr['TEXCOORD_0']);indices=accessor(primitive['indices']).astype('uint32').ravel()
   if 'skin' in node:
    skin=doc['skins'][node['skin']];inv=accessor(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);joints=accessor(attr['JOINTS_0']);weights=accessor(attr['WEIGHTS_0']);matrices=np.array([transforms[j]@inv[k] for k,j in enumerate(skin['joints'])]);blend=np.sum(matrices[joints]*weights[:,:,None,None],axis=1);v4=np.c_[pos,np.ones(len(pos))];pos=np.einsum('nij,nj->ni',blend,v4)[:,:3];norm=np.einsum('nij,nj->ni',blend[:,:3,:3],norm)
   else:pos=(transforms[i]@np.c_[pos,np.ones(len(pos))].T).T[:,:3];norm=(transforms[i][:3,:3]@norm.T).T
   material_doc=doc['materials'][primitive.get('material',0)];tex=material_doc['pbrMetallicRoughness']['baseColorTexture']['index'];im=doc['images'][doc['textures'][tex]['source']];v=doc['bufferViews'][im['bufferView']];image=Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGBA')
   batches.append((pos,norm,uv,indices,image))
 return batches

def render(name,file=None,animation=None,time=0):
 batches=read_glb(ROOT/'assets/models'/((file or name)+'.glb'),animation,time)
 allpos=np.concatenate([b[0] for b in batches]);lo=allpos.min(0);hi=allpos.max(0);centre=(lo+hi)/2;scale=2/(hi[1]-lo[1]);extent=(hi-lo)*scale
 viewport(0,0,width,height);clearcolor(0,0,0,0);clear(0x4000|0x100);enable(0x0B71);enable(0x0BA1);disable(0x0B44)
 f=1/np.tan(np.radians(34)/2);near=.01;far=100
 projection=np.array([[f/(width/height),0,0,0],[0,f,0,0],[0,0,(far+near)/(near-far),2*far*near/(near-far)],[0,0,-1,0]])
 matrixmode(0x1701);mat(projection);matrixmode(0x1700)
 view=np.eye(4);view[2,3]=-max(3.9,extent[0]*2.1);view[1,3]=-.015;mat(view)
 enable(0x0B50);enable(0x4000);enable(0x4001)
 light(0x4000,0x1203,fv([-3,4,6,0]));light(0x4000,0x1201,fv([.8,.8,.8,1]));light(0x4000,0x1200,fv([.25,.25,.25,1]))
 light(0x4001,0x1203,fv([4,2,4,0]));light(0x4001,0x1201,fv([.45,.45,.45,1]));material(0x0408,0x1602,fv([1,1,1,1]))
 enableclient(0x8074);enableclient(0x8075);enableclient(0x8078);enable(0x0DE1)
 for pos,norm,uv,indices,pic in batches:
  pos=np.ascontiguousarray((pos-centre)*scale,dtype='float32');norm=np.ascontiguousarray(norm,dtype='float32');uv=np.ascontiguousarray(uv,dtype='float32');pixels=np.ascontiguousarray(pic,dtype='uint8')
  tex=ui();gentex(1,C.byref(tex));bindtex(0x0DE1,tex);texparam(0x0DE1,0x2801,0x2601);texparam(0x0DE1,0x2800,0x2601);teximage(0x0DE1,0,0x1908,pic.width,pic.height,0,0x1908,0x1401,pixels.ctypes.data)
  vertexptr(3,0x1406,0,pos.ctypes.data);normalptr(0x1406,0,norm.ctypes.data);uvptr(2,0x1406,0,uv.ctypes.data);draw(4,len(indices),0x1405,indices.ctypes.data)
 rgba=np.empty((height,width,4),dtype='uint8');readpixels(0,0,width,height,0x1908,0x1401,rgba.ctypes.data)
 image=Image.fromarray(rgba[::-1]);bounds=image.getbbox();image=image.crop(bounds);image.thumbnail((320,380),Image.Resampling.LANCZOS)
 image.save(ROOT/'assets/helpers'/(name+'.png'))
 print(name,'bounds',lo.round(3),hi.round(3),'portrait',image.size)

if __name__=='__main__':
 for name,file in [('shaheen',None),('fahem',None),('maha',None),('hessa',None),('hamad',None),('grandma',None),('grandpa',None)]:render(name,file)
