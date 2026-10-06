import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const cast = {
  Me: ['hessa', 1.40], Brother: ['hamad', 1.45], Mom: ['mother', 1.65],
  Dad: ['father', 1.78], Grandma: ['grandma', 1.58], Grandpa: ['grandpa', 1.72]
};
const loader = new GLTFLoader();
const actors = new Set();
const loaded = new Map();
const scratch = new THREE.Vector3();

function inPlace(clip, root) {
  const copy = clip.clone();
  for (const track of copy.tracks) {
    if (/Hips\.position$/.test(track.name)) {
      const bone = root.getObjectByName(track.name.split('.')[0]);
      for (let i = 0; i < track.values.length; i += 3) {
        track.values[i] = bone?.position.x || 0;
        track.values[i + 2] = bone?.position.z || 0;
      }
    }
  }
  return copy;
}

async function load(name) {
  if (!loaded.has(name)) loaded.set(name, (async () => {
    const response = await fetch(new URL(`models/${name}.glb`, import.meta.url), {
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return loader.parseAsync(await response.arrayBuffer(), '');
  })().catch(error => { loaded.delete(name); throw error; }));
  return loaded.get(name);
}

function attach(world, actor, gltf, height) {
  if (actor.userData.model) return;
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = height / size.y;
  const visual = new THREE.Group();
  visual.add(root);
  root.scale.multiplyScalar(scale);
  root.position.set(-(bounds.min.x + bounds.max.x) / 2 * scale, -bounds.min.y * scale,
    -(bounds.min.z + bounds.max.z) / 2 * scale);
  root.traverse(node => {
    if (node.isMesh) {
      node.castShadow = true; node.receiveShadow = true;
      node.frustumCulled = false;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material.map) material.map.anisotropy = Math.min(4, world.renderer.capabilities.getMaxAnisotropy());
        material.roughness = Math.max(.62, material.roughness);
        material.metalness = Math.min(.25, material.metalness);
      }
    }
  });
  const bones = [];
  root.traverse(node => { if (node.isBone) bones.push(node); });
  const tracks = [];
  for (const bone of bones) {
    tracks.push(new THREE.QuaternionKeyframeTrack(bone.name + '.quaternion', [0, 2],
      [...bone.quaternion.toArray(), ...bone.quaternion.toArray()]));
    tracks.push(new THREE.VectorKeyframeTrack(bone.name + '.position', [0, 2],
      [...bone.position.toArray(), ...bone.position.toArray()]));
  }
  const mixer = new THREE.AnimationMixer(root);
  const idle = mixer.clipAction(new THREE.AnimationClip('Quiet standing', 2, tracks));
  const walkClip = gltf.animations.find(a => a.name === 'Walking_Woman') ||
    gltf.animations.find(a => a.name === 'Walking');
  const sitClip = gltf.animations.find(a => a.name === 'Sit_Cross_Legged_on_Floor');
  const walk = walkClip ? mixer.clipAction(inPlace(walkClip, root)) : null;
  const sit = sitClip ? mixer.clipAction(inPlace(sitClip, root)) : null;
  idle.play();
  const head = bones.find(b => /Head$/.test(b.name));
  actor.clear();
  actor.scale.setScalar(1);
  actor.add(visual);
  const anchor = new THREE.Group();
  anchor.position.y = height * .89;
  actor.add(anchor);
  actor.userData.head = anchor;
  actor.userData.unit = 1;
  actor.userData.model = { root, visual, mixer, idle, walk, sit, head, height, action: idle, pose: 'idle' };
  actors.add(actor);
  world.renderer.shadowMap.needsUpdate = true;
}

function pose(model, kind) {
  if (model.pose === kind) return;
  const next = kind === 'walk' ? model.walk || model.idle : kind === 'sit' ? model.sit || model.idle : model.idle;
  if (next !== model.action) {
    model.action.fadeOut(.2);
    next.reset().setEffectiveWeight(1).fadeIn(.2).play();
    if (kind === 'sit') {
      next.time = Math.min(next.getClip().duration * .6, 2);
      next.paused = true;
    } else next.paused = false;
    model.action = next;
  }
  model.pose = kind;
}

function update(world, actor, dt, walking) {
  const data = actor.userData, model = data.model;
  if (!model) return;
  const seated = data.sitting && !!model.sit;
  pose(model, seated ? 'sit' : actor === world.player && walking ? 'walk' : 'idle');
  if (model.walk) model.walk.setEffectiveTimeScale(Math.max(.7, Math.min(1.5, (world.walkSpeed || 1.3) / 1.3)));
  model.mixer.update(dt);
  // The imported seated animations rest on the existing majlis cushions.
  if (actor !== world.player) actor.position.y = actor.parent === world.zones[0] ? 5 : seated ? .44 : 0;
  if (model.head) {
    model.root.updateMatrixWorld(true);
    model.head.getWorldPosition(scratch);
    actor.worldToLocal(scratch);
    data.head.position.copy(scratch);
  }
  if (walking || seated || world.speaker === data.name) world.renderer.shadowMap.needsUpdate = true;
}

function prepareScene(world, index) {
  if (!world) return;
  const hamad = world.family.find(actor => actor.userData.name === 'Brother');
  if (!hamad) return;
  const outdoors = index === 2 || index === 3;
  const position = outdoors ? [11.5, 0, 4.4] : [-4.65, 0, -10.8];
  world.zones[outdoors ? 2 : 1].add(hamad);
  hamad.position.set(...position);
  hamad.userData.sitting = false;
  hamad.rotation.y = outdoors ? -Math.PI / 2 : 0;
  world.renderer.shadowMap.needsUpdate = true;
}

async function loadAll(world) {
  if (!world) return { loaded: 0, failed: [] };
  const family = world.family.filter(a => cast[a.userData.name]);
  let count = 0;
  const failed = [];
  // Two downloads at a time keep decoding responsive on school laptops.
  const queue = [...family];
  const worker = async () => {
    while (queue.length) {
      const actor = queue.shift();
      const [name, height] = cast[actor.userData.name];
      try { attach(world, actor, await load(name), height); }
      catch (error) { failed.push(name); console.warn('Character load failed:', name, error.message); }
      count++;
      const button = document.querySelector('[data-action="ready"]');
      if (button) button.textContent = `Preparing characters… ${count}/${family.length}`;
    }
  };
  await Promise.all([worker(), worker()]);
  prepareScene(world, window.ScienceGame?.S.scene || 0);
  window.characterLoadStatus = { loaded: family.length - failed.length, failed };
  return window.characterLoadStatus;
}

window.CharacterModels = { loadAll, prepareScene, update, actors };
export { loadAll, prepareScene, update };
