import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const cast = {
  Me: ['hessa', 1.40], Brother: ['hamad', 1.45], Mom: ['mother', 1.65],
  Dad: ['father', 1.78], Grandma: ['grandma', 1.58], Grandpa: ['grandpa', 1.72]
};
const loader = new GLTFLoader(), actors = new Set(), loaded = new Map();
const scratch = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
const seats = {Grandma:[-10.8,-12.25,0], Grandpa:[-7.3,-12.25,0], Brother:[-4.65,-10.7,-Math.PI/2]};
let floorReference=null;
const seatHeight = .418; // The original sadu cushions end at y=.42.

function inPlace(clip, root) {
  const copy = clip.clone();
  for (const track of copy.tracks) if (/Hips\.position$/.test(track.name)) {
    const bone = root.getObjectByName(track.name.split('.')[0]);
    for (let i = 0; i < track.values.length; i += 3) {
      track.values[i] = bone?.position.x || 0;
      track.values[i + 2] = bone?.position.z || 0;
    }
  }
  return copy;
}
async function load(name) {
  if (!loaded.has(name)) loaded.set(name, (async () => {
    const response = await fetch(new URL(`models/${name}.glb`, import.meta.url), {signal: AbortSignal.timeout(45000)});
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return loader.parseAsync(await response.arrayBuffer(), '');
  })().catch(error => { loaded.delete(name); throw error; }));
  return loaded.get(name);
}
function syncSkin(root) {
  root.updateMatrixWorld(true);
  root.traverse(node => { if (node.isSkinnedMesh) node.skeleton.update(); });
}
function skinBounds(root) {
  syncSkin(root);
  return new THREE.Box3().setFromObject(root, true);
}
function attach(world, actor, gltf, height) {
  if (actor.userData.model) return;
  if(actor.userData.name==='Grandpa')floorReference=gltf.animations.find(a=>a.name==='Sit_Cross_Legged_on_Floor');
  const root = gltf.scene, bounds = skinBounds(root), size = bounds.getSize(new THREE.Vector3());
  const scale = height / size.y, visual = new THREE.Group();
  visual.add(root); root.scale.multiplyScalar(scale);
  root.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
  const bones=[];
  root.traverse(node => {
    if (node.isBone) bones.push(node);
    if (!node.isMesh) return;
    node.castShadow=true; node.receiveShadow=true; node.frustumCulled=false;
    for (const material of Array.isArray(node.material)?node.material:[node.material]) {
      if(material.map) material.map.anisotropy=Math.min(2,world.renderer.capabilities.getMaxAnisotropy());
      material.roughness=Math.max(.62,material.roughness); material.metalness=Math.min(.25,material.metalness);
    }
  });
  const tracks=[];
  for(const bone of bones) {
    tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',[0,2],[...bone.quaternion.toArray(),...bone.quaternion.toArray()]));
    tracks.push(new THREE.VectorKeyframeTrack(bone.name+'.position',[0,2],[...bone.position.toArray(),...bone.position.toArray()]));
  }
  const mixer=new THREE.AnimationMixer(root), idle=mixer.clipAction(new THREE.AnimationClip('Quiet standing',2,tracks));
  const walkClip=gltf.animations.find(a=>a.name==='Walking_Woman')||gltf.animations.find(a=>a.name==='Walking');
  const sitClip=gltf.animations.find(a=>/^Sit_Cross_Legged(?:_on_Floor)?$/.test(a.name));
  const walk=walkClip?mixer.clipAction(inPlace(walkClip,root)):null, sit=sitClip?mixer.clipAction(inPlace(sitClip,root)):null;
  let sitFloorOffset=0;
  if(sit) {
    sit.play(); sit.time=sit.getClip().duration*.65; sit.paused=true; mixer.update(0);
    // Bounding a posed skin requires fresh bone matrices, not the standing bounds.
    sitFloorOffset=-skinBounds(root).min.y;
    sit.stop();
  }
  idle.play(); mixer.update(0);
  const head=bones.find(b=>/Head$/.test(b.name));
  actor.clear(); actor.scale.setScalar(1); actor.add(visual);
  const anchor=new THREE.Group(); anchor.position.y=height*.89; actor.add(anchor);
  actor.userData.head=anchor; actor.userData.unit=1;
  actor.userData.model={root,visual,mixer,idle,walk,sit,sitFloorOffset,head,height,bones,action:idle,pose:'idle',headBase:head?.quaternion.clone(),restBones:new Map(bones.map(b=>[b,b.quaternion.clone()])),time:0,clips:gltf.animations.map(a=>a.name)};
  actors.add(actor); world.renderer.shadowMap.needsUpdate=true;
}
function pose(model,kind) {
  if(model.pose===kind)return false;
  const next=kind==='walk'?model.walk||model.idle:kind==='sit'?model.sit||model.idle:model.idle;
  model.mixer.stopAllAction(); next.reset().setEffectiveWeight(1).play();
  if(kind==='sit') {next.time=next.getClip().duration*.65;next.paused=true;}
  else next.paused=false;
  model.mixer.update(0); model.action=next; model.pose=kind; model.headBase=model.head?.quaternion.clone();
  return true;
}
function update(world,actor,dt,walking) {
  const data=actor.userData, model=data.model; if(!model)return;
  if(actor!==world.player && actor.parent?.visible===false)return;
  const sharing=world.sharing, isWalking=(actor===world.player&&walking)||!!data.sceneWalking;
  const seated=data.sitting&&!!model.sit, kind=seated?'sit':isWalking?'walk':'idle';
  const changed=pose(model,kind);
  // Reset keyed bones for scripted reaches; frozen seated poses cost no per-frame mixing.
  if(sharing&&!isWalking)for(const [bone,q] of model.restBones)bone.quaternion.copy(q);
  if(isWalking||sharing||changed) {
    model.mixer.update(isWalking?dt:0); model.headBase=model.head?.quaternion.clone();
  } else if(model.head&&model.headBase) model.head.quaternion.copy(model.headBase);
  if(model.walk)model.walk.setEffectiveTimeScale(Math.max(.7,Math.min(1.5,(world.walkSpeed||1.3)/1.3)));
  model.visual.position.y=seated?seatHeight+model.sitFloorOffset:0;
  if(actor!==world.player)actor.position.y=actor.parent===world.zones[0]?5:0;
  if(seated) actor.rotation.y=seats[data.name]?.[2]||0;
  if(model.head&&!sharing&&actor!==world.player&&actor.parent===world.zones[world.zone]) {
    const p=world.player.position, yaw=Math.atan2(p.x-actor.position.x,p.z-actor.position.z)-actor.rotation.y;
    const turn=Math.max(-.48,Math.min(.48,Math.atan2(Math.sin(yaw),Math.cos(yaw))));
    model.head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(up,turn));
  }
  if(data.reach) reach(actor,data.reach);
  if(data.nod&&model.head)model.head.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.sin(data.nod)*.12));
  if(model.head) {
    actor.updateMatrixWorld(true); model.head.getWorldPosition(scratch); actor.worldToLocal(scratch); data.head.position.copy(scratch);
  }
  model.time+=dt;
  if(changed||(isWalking||sharing)&&model.time-(model.shadowAt||0)>.10){world.renderer.shadowMap.needsUpdate=true;model.shadowAt=model.time;}
}
function fitHamadToMajlis(world){
  const actor=world.family.find(a=>a.userData.name==='Brother'),model=actor?.userData.model;
  if(!model||model.floorPose||!floorReference)return;
  // Hamad's supplied crossed-leg clip is a high-chair pose. Use the supplied
  // grandfather's matching humanoid leg rotations for the low Emirati majlis.
  const tracks=floorReference.tracks.filter(t=>t.name.endsWith('.quaternion')&&model.root.getObjectByName(t.name.split('.')[0])).map(t=>t.clone());
  model.mixer.stopAllAction();model.visual.position.y=0;
  model.sit=model.mixer.clipAction(new THREE.AnimationClip('Cross-legged majlis seat',floorReference.duration,tracks));
  model.sit.play();model.sit.time=floorReference.duration*.65;model.sit.paused=true;model.mixer.update(0);
  model.sitFloorOffset=actor.getWorldPosition(new THREE.Vector3()).y-skinBounds(model.root).min.y;
  model.action=model.sit;model.pose='sit';model.floorPose=true;model.headBase=model.head?.quaternion.clone();
}
function prepareScene(world,index) {
  if(!world)return;
  cancelSharing(world);fitHamadToMajlis(world);
  const hamad=world.family.find(a=>a.userData.name==='Brother');
  for(const actor of world.family) {
    const seat=seats[actor.userData.name];
    if(seat&&actor!==hamad){world.zones[1].add(actor);actor.position.set(seat[0],0,seat[1]);actor.rotation.y=seat[2];actor.userData.sitting=true;}
  }
  if(hamad) {
    const outdoors=index===2||index===3, seat=seats.Brother;
    world.zones[outdoors?2:1].add(hamad);hamad.position.set(...(outdoors?[11.4,0,6.35]:[seat[0],0,seat[1]]));
    hamad.userData.sitting=!outdoors;hamad.rotation.y=outdoors?-Math.PI/2:seat[2];
  }
  for(const actor of world.family)if(actor.userData.model)update(world,actor,0,false);
  world.renderer.shadowMap.needsUpdate=true;
}
function face(actor,target) {actor.rotation.y=Math.atan2(target.x-actor.position.x,target.z-actor.position.z);}
function aimBone(bone,child,target) {
  const origin=bone.getWorldPosition(new THREE.Vector3()), direction=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
  const desired=target.clone().sub(origin).normalize();
  const rotation=new THREE.Quaternion().setFromUnitVectors(direction,desired).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));bone.updateWorldMatrix(false,true);
}
function hand(actor) {return actor.userData.model?.bones.find(b=>/RightHand$/.test(b.name));}
function reach(actor,target) {
  const model=actor.userData.model, upper=model?.bones.find(b=>/RightArm$/.test(b.name)), lower=model?.bones.find(b=>/RightForeArm$/.test(b.name)), palm=hand(actor);
  if(!upper||!lower||!palm)return;
  actor.updateMatrixWorld(true);
  const a=upper.getWorldPosition(new THREE.Vector3()), b=lower.getWorldPosition(new THREE.Vector3()), c=palm.getWorldPosition(new THREE.Vector3());
  const l1=a.distanceTo(b),l2=b.distanceTo(c), direction=target.clone().sub(a),distance=Math.min(direction.length(),(l1+l2)*.98);
  direction.normalize();const along=(l1*l1-l2*l2+distance*distance)/(2*Math.max(.01,distance));
  const bend=new THREE.Vector3(.25,-1,.15).addScaledVector(direction,-new THREE.Vector3(.25,-1,.15).dot(direction)).normalize();
  const elbow=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  aimBone(upper,lower,elbow);aimBone(lower,palm,target);
}
function makeMarshmallow() {
  const prop=new THREE.Group();prop.name='Shared marshmallow';
  const stick=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.42,8),new THREE.MeshStandardMaterial({color:'#986339',roughness:.9}));
  stick.rotation.x=Math.PI/2;stick.position.z=.15;prop.add(stick);
  const sweet=new THREE.Mesh(new THREE.CapsuleGeometry(.072,.07,5,10),new THREE.MeshStandardMaterial({color:'#dcac70',roughness:.85}));
  sweet.rotation.x=Math.PI/2;sweet.position.z=.35;prop.add(sweet);prop.traverse(m=>{if(m.isMesh)m.castShadow=true;});return prop;
}
function setupSharing(world) {
  if(!world)return;
  cancelSharing(world);
  const get=name=>world.family.find(a=>a.userData.name===name), hessa=world.player,mom=get('Mom'),hamad=get('Brother'),dad=get('Dad');
  world.setZone(2,[6.95,6.6]);world.path=[];world.autoWalk=false;world.mode='sharing';world.drawRoute([]);
  for(const [actor,pos] of [[mom,[6.7,0,5.4]],[hamad,[11.4,0,6.35]],[dad,[6.0,0,7.4]]])if(actor){world.zones[2].add(actor);actor.position.set(...pos);actor.userData.sitting=false;face(actor,hessa.position);}
  face(hessa,mom.position);hessa.visible=true;
  world.focus={position:new THREE.Vector3(9.1,2.75,10.65),target:new THREE.Vector3(8.6,1.0,6.3),fov:57};
  world.sharing={time:0,playing:false,hessa,mom,hamad,dad,prop:makeMarshmallow(),owner:mom,callbacks:{},events:[]};
  world.scene.add(world.sharing.prop);mom.userData.reach=new THREE.Vector3(6.84,1.00,5.98);
  for(const actor of [hessa,mom,hamad,dad])if(actor)update(world,actor,0,false);
  updateSharing(world,0);
}
function startSharing(world,callbacks={}) {
  if(!world)return false;
  if(!world.sharing)setupSharing(world);
  Object.assign(world.sharing,{playing:true,time:0,callbacks,events:[]});return true;
}
function updateSharing(world,dt) {
  const s=world.sharing;if(!s)return;
  const {hessa,mom,hamad,prop}=s;
  if(s.playing&&!window.ScienceGame?.S.paused)s.time+=Math.min(dt,.05);
  const t=s.time;
  const emit=(key,speaker,text)=>{if(!s.events.includes(key)){s.events.push(key);s.callbacks.say?.(speaker,text);}};
  hessa.userData.sceneWalking=false;delete hessa.userData.reach;delete hamad.userData.reach;delete hamad.userData.nod;
  if(t<1.5) {
    mom.userData.reach=new THREE.Vector3(6.84,1.00,5.98);
    if(s.playing)hessa.userData.reach=new THREE.Vector3(6.84,1.00,6.05);
    if(t>=1.12)s.owner=hessa;
  }else {
    delete mom.userData.reach;
    if(t<5.1) {
      const progress=Math.min(1,(t-1.5)/3.6), points=[new THREE.Vector3(6.95,0,6.6),new THREE.Vector3(7.25,0,6.50),new THREE.Vector3(9.3,0,6.50),new THREE.Vector3(10.48,0,6.50)];
      const lengths=points.slice(1).map((p,i)=>p.distanceTo(points[i])),total=lengths.reduce((a,b)=>a+b,0);let distance=progress*total;
      for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){hessa.position.copy(points[i]).lerp(points[i+1],Math.min(1,distance/lengths[i]));face(hessa,points[i+1]);break;}distance-=lengths[i];}
      hessa.userData.sceneWalking=true;hessa.userData.reach=hessa.position.clone().add(new THREE.Vector3(.10,.91,.23).applyAxisAngle(up,hessa.rotation.y));
    }else {
      face(hessa,hamad.position);face(hamad,hessa.position);
      const target=new THREE.Vector3(10.96,1.02,6.44);
      hessa.userData.reach=target.clone();hamad.userData.reach=target.clone();
      emit('offer','Me','Here you are!');
      if(t>=6.55){s.owner=hamad;delete hessa.userData.reach;hamad.userData.reach=new THREE.Vector3(11.05,1.12,6.52);hamad.userData.nod=(t-6.55)*5;emit('thanks','Brother','Thank you, Hessa!');}
    }
  }
  // Called after actors have been posed; the prop stays with the actual animated hand.
  const palm=hand(s.owner);
  if(palm){s.owner.updateMatrixWorld(true);prop.position.copy(palm.getWorldPosition(new THREE.Vector3()));}
  else prop.position.copy(s.owner.position).add(new THREE.Vector3(0,1,.3));
  prop.rotation.set(-.3,s.owner.rotation.y,0);
  if(t>=9.8&&!s.finished&&!window.ScienceGame?.voiceEngine?.current){s.finished=true;s.playing=false;s.callbacks.done?.();}
}
function cancelSharing(world) {
  if(!world?.sharing)return;
  const s=world.sharing;s.prop.removeFromParent();s.prop.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});
  for(const a of [s.hessa,s.mom,s.hamad,s.dad])if(a){delete a.userData.reach;delete a.userData.sceneWalking;delete a.userData.nod;}
  world.sharing=null;
}
function dialogueCamera(world,speaker) {
  if(world.sharing)return;
  if(speaker!=='Me')return;
  // Her reply should show Hessa and her partner, not a glass filling the view.
  const p=world.player.position, partner=world.lastPartner;
  if(!partner||partner.parent!==world.zones[world.zone]){world.mode='talk';world.focus=null;return;}
  if(world.zone===1&&p.x<-4&&p.z<-6.5){world.focus={position:new THREE.Vector3(-5.5,2.35,-7.5),target:new THREE.Vector3(-8.3,1.05,-10.7),fov:74};world.mode='talk';return;}
  const q=partner.position, centre=p.clone().lerp(q,.5).add(new THREE.Vector3(0,1.05,0));
  const away=p.clone().sub(q).setY(0).normalize(),side=new THREE.Vector3(-away.z,0,away.x);
  world.focus={position:centre.clone().addScaledVector(away,Math.max(3.2,p.distanceTo(q)*.65+1)).addScaledVector(side,1.2).add(new THREE.Vector3(0,.75,0)),target:centre,fov:58};world.mode='talk';
}
async function loadAll(world) {
  if(!world)return{loaded:0,failed:[]};
  const family=world.family.filter(a=>cast[a.userData.name]);let count=0;const failed=[],queue=[...family];
  const worker=async()=>{while(queue.length){const actor=queue.shift(),[name,height]=cast[actor.userData.name];try{attach(world,actor,await load(name),height);}catch(error){failed.push(name);console.warn('Character load failed:',name,error.message);}count++;const button=document.querySelector('[data-action="ready"]');if(button)button.textContent=`Preparing characters… ${count}/${family.length}`;await new Promise(r=>setTimeout(r,0));}};
  await Promise.all([worker(),worker()]);prepareScene(world,window.ScienceGame?.S.scene||0);
  window.characterLoadStatus={loaded:family.length-failed.length,failed};return window.characterLoadStatus;
}
window.CharacterModels={loadAll,prepareScene,update,actors,setupSharing,startSharing,updateSharing,cancelSharing,dialogueCamera,skinBounds,attach};
export { loadAll, prepareScene, update };
