import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
globalThis.window=globalThis;globalThis.self=globalThis;globalThis.innerWidth=1366;globalThis.innerHeight=768;globalThis.devicePixelRatio=1;globalThis.addEventListener=()=>{};
globalThis.document={createElement:tag=>{if(tag==='canvas'){const c=createCanvas(32,32);c.style={};c.addEventListener=()=>{};c.setPointerCapture=()=>{};return c;}return{style:{},addEventListener(){}};},createElementNS:(_,tag)=>document.createElement(tag),querySelector:()=>null};
globalThis.CPURenderer=class{constructor(c){this.domElement=c;this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.ratio=1;}setPixelRatio(n){this.ratio=n;}getPixelRatio(){return this.ratio;}setSize(){}setAnimationLoop(){}compile(){}render(){}getContext(){return{finish(){}}}};
let source=fs.readFileSync(ROOT+'/assets/game.js','utf8');source=source.replace('new Ir({canvas:e,antialias:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1})','new window.CPURenderer(e)').replace('m0();})();','window.CPUClasses={World:vl,Lab:xl};})();');
(0,eval)(source);
const T=await import('../vendor/three.module.js'),{GLTFLoader}=await import('../vendor/GLTFLoader.js');await import('../assets/characters.js');
const canvas=document.createElement('canvas'),world=new CPUClasses.World(canvas,'#367d77'),lab=new CPUClasses.Lab(world);world.attachLab(lab);
const loader=new GLTFLoader();loader.register(parser=>({name:'CPUTextures',loadTexture(index){const texture=parser.json.textures[index],image=parser.json.images[texture.source];return parser.getDependency('bufferView',image.bufferView).then(async bytes=>{const im=await loadImage(Buffer.from(bytes));const tex=new T.Texture(im);tex.flipY=false;tex.colorSpace=T.SRGBColorSpace;return tex;});}}));
const cast={Me:['hessa',1.4],Brother:['hamad',1.45],Grandma:['grandma',1.58],Grandpa:['grandpa',1.72],Mom:['mother',1.65],Dad:['father',1.78]};
for(const actor of world.family){const [name,height]=cast[actor.userData.name]||[];if(!name)continue;const bytes=fs.readFileSync(ROOT+'/assets/models/'+name+'.glb');const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');CharacterModels.attach(world,actor,gltf,height);}
world.setZone(1,[-7.2,-8]);CharacterModels.prepareScene(world,0);
const checks=[];function check(name,ok,data){checks.push({name,ok:!!ok,data});if(!ok)throw Error(name+' '+JSON.stringify(data));}
for(const actor of world.family.filter(a=>['Grandma','Grandpa','Brother'].includes(a.userData.name))){CharacterModels.update(world,actor,0,false);const b=CharacterModels.skinBounds(actor.userData.model.root);check('Cushion contact: '+actor.userData.name,Math.abs(b.min.y-.418)<.005,{min:b.min.toArray(),max:b.max.toArray(),offset:actor.userData.model.sitFloorOffset});check('Seated clip: '+actor.userData.name,actor.userData.model.pose==='sit');}
check('Hamad faces into the majlis',Math.abs(world.family.find(a=>a.userData.name==='Brother').rotation.y+Math.PI/2)<.001);
function settle(){for(let i=0;i<90;i++)world.director.update(1/60);world.scene.updateMatrixWorld(true);}
function exportScene(name){
 settle();const out=ROOT+'/review/'+name;fs.mkdirSync(out,{recursive:true});const buffers=[],entries=[],images=new Map();let size=0;
 const append=arr=>{const b=Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength),entry={offset:size,length:arr.length};buffers.push(b);size+=b.length;return entry;};
 world.scene.traverseVisible(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.geometry.attributes.position)return;const geom=mesh.geometry,mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;if(!mat||mat.opacity<.3)return;
   const position=new Float32Array(geom.attributes.position.count*3),v=new T.Vector3();if(mesh.isSkinnedMesh)mesh.skeleton.update();
   for(let i=0;i<geom.attributes.position.count;i++){mesh.getVertexPosition(i,v);v.applyMatrix4(mesh.matrixWorld);position.set(v.toArray(),i*3);}
   let texture=null;if(mat.map?.image){const im=mat.map.image;if(!images.has(im)){try{const c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);const name='texture-'+images.size+'.png';fs.writeFileSync(out+'/'+name,c.toBuffer('image/png'));images.set(im,name);}catch{}}texture=images.get(im)||null;}
   const uv=geom.attributes.uv?Float32Array.from(geom.attributes.uv.array):new Float32Array(position.length/3*2),index=geom.index?Uint32Array.from(geom.index.array):Uint32Array.from({length:position.length/3},(_,i)=>i);
   entries.push({name:mesh.name,position:append(position),uv:append(uv),index:append(index),texture,flipY:mat.map?.flipY??true,repeat:mat.map?.repeat?.toArray()||[1,1],color:mat.color?.getHexString()||'ffffff',opacity:mat.opacity??1});
 });
 fs.writeFileSync(out+'/geometry.bin',Buffer.concat(buffers));fs.writeFileSync(out+'/scene.json',JSON.stringify({entries,camera:world.camera.matrixWorldInverse.toArray(),projection:world.camera.projectionMatrix.toArray(),background:world.scene.background.getHexString()}));console.log('Exported',name,entries.length,'meshes',size,'bytes');
}
world.talk('Grandma');for(const a of world.family)CharacterModels.update(world,a,1/60,false);exportScene('majlis-seating');
world.talk('Me');CharacterModels.dialogueCamera(world,'Me');exportScene('hessa-reply');console.log('Hessa camera',world.player.position.toArray(),world.camera.position.toArray(),world.player.visible,CharacterModels.skinBounds(world.player.userData.model.root));
world.focus={position:new T.Vector3(-8.0,2.0,-7.15),target:new T.Vector3(-8.1,1,-11.6),fov:78};exportScene('family-seated');
CharacterModels.setupSharing(world);CharacterModels.startSharing(world,{say:(speaker,text)=>checks.push({name:'Sharing line',ok:true,speaker,text})});
let captured=false;for(let i=0;i<595;i++){
  for(const actor of world.family)CharacterModels.update(world,actor,1/60,false);CharacterModels.updateSharing(world,1/60);
  if(world.sharing.time>2&&world.sharing.time<5){const p=world.player.position;check('Sharing route clear '+i,!world.nav.blocked(p.x,p.z,2,false),p.toArray());}
  if(!captured&&world.sharing.time>=6.8){exportScene('marshmallow-handover');captured=true;}
}
check('Hamad holds marshmallow after handover',world.sharing.owner.userData.name==='Brother');
check('Thank-you occurs once',world.sharing.events.filter(e=>e==='thanks').length===1);
check('Sharing completes',world.sharing.finished);
CharacterModels.cancelSharing(world);check('Cutscene cleans up',!world.sharing&&!world.player.userData.sceneWalking&&!world.player.userData.reach);
fs.writeFileSync(ROOT+'/tests/world-results.json',JSON.stringify(checks,null,2));console.log('PASS',checks.length,'checks');
