const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const { test } = require('./game.cjs');
(async () => {
const THREE = await import('three');
const source = esbuild.transformSync(fs.readFileSync(path.join(__dirname,'../renderer3d.js'),'utf8'),{format:'cjs'}).code;
let lastScene, lastRenderer;
class Renderer {
  constructor(options){assert.equal(options.antialias,false,'no MSAA edge blending');lastRenderer=this;this.info={render:{calls:0}};this.capabilities={getMaxAnisotropy:()=>8};}
  setPixelRatio(value){assert.ok(value<=2);this.ratio=value;}
  setSize(w,h){this.width=w;this.height=h;}
  render(scene){lastScene=scene;this.info.render.calls=scene.children.filter(m=>m.isInstancedMesh&&m.count>0).length;}
}
function boot(fail=false){
  const context2d={fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createLinearGradient(){return{addColorStop(){}};}};
  const nodes={};
  function node(){return{style:{width:'800px',height:'448px',left:'0px',top:'86px'},dataset:{},events:{},addEventListener(name,fn){this.events[name]=fn;},getContext(){return context2d;}};}
  const world={console:{warn(){}},window:{devicePixelRatio:3},document:{getElementById(id){return nodes[id]??=node();},createElement:node},require(name){assert.equal(name,'three');return{...THREE,WebGLRenderer:fail?class{constructor(){throw new Error('no WebGL');}}:Renderer};}};
  vm.runInNewContext(source,world);
  return{view:world.window.Cargo3D,world,nodes};
}
const {view,world,nodes}=boot();assert.equal(view.enabled,true);
const shapeTypes=new Set();let maxCalls=0;
for(let stage=0;stage<100;stage++){
 test.newGame(stage);test.state='play';
 const level=test.L;level.zs.forEach(z=>{z.active=true;});
 const game={L:level,cam:0,frame:200,player:test.p,effects:{shield:30},weapon:test.WEAPONS[stage%9],flagY:64,
   bullets:[{x:260,y:330,vx:14,vy:0,color:'#ffab65'}],spits:[{x:350,y:330}],parts:[{x:300,y:330,kind:'spark'}],state:'play'};
 const beforeRender=JSON.stringify([level.grid,level.elements,level.pickups,level.bolts]);
 world.window.__game=game;view.render(game);
 assert.equal(JSON.stringify([level.grid,level.elements,level.pickups,level.bolts]),beforeRender,'visual changes must not change collisions or elements');
 const meshes=lastScene.children.filter(m=>m.isInstancedMesh&&m.count>0);
 assert.ok(meshes.some(m=>m.userData.readabilityRole==='scenery'),'muted scenery present in stage '+stage);
 assert.ok(meshes.some(m=>m.userData.readabilityRole==='cue'&&m.material.color.getHexString()==='7cfff0'),'cyan landing cue in stage '+stage);
 for(const m of meshes.filter(m=>m.userData.readabilityRole==='cue')){assert.equal(m.material.isMeshBasicMaterial,true);assert.equal(m.material.toneMapped,false);}
 for(const m of meshes.filter(m=>m.userData.readabilityRole==='scenery'))assert.equal(m.material.emissiveIntensity,0,'background must not glow like a pickup');
 assert.equal(nodes.world3d.dataset.rendered,'true');assert.equal(nodes.world3d.style.top,'86px');
 for(const mesh of lastScene.children.filter(n=>n.isInstancedMesh)){
   assert.ok(mesh.count<=2048,'instance capacity');
   if(mesh.count)shapeTypes.add(mesh.geometry.type);
   const values=mesh.instanceMatrix.array.subarray(0,mesh.count*16);
   assert.ok(values.every(Number.isFinite),'finite transforms on stage '+stage);
 }
 maxCalls=Math.max(maxCalls,lastRenderer.info.render.calls);
 assert.ok(lastScene.children.some(m=>m.isMesh&&m.material.map?.isCanvasTexture),'generated sky texture present');
}
// Exercise carried cargo, unlocked finishes and boss warning/strike cues in all regions.
for(const stage of [4,9,14,19,24]){
 test.newGame(stage);test.spawnBoss();const level=test.L;
 level.cargo.carried=true;Object.assign(level.boss,{signatureWarning:60,targetX:700,targets:[610,700,790]});
 const game={L:level,cam:640,frame:200,player:test.p,effects:{},weapon:test.WEAPONS[0],flagY:64,bullets:[],spits:[],parts:[],state:'play',cosmetic:{outfit:'#31bcb7',skin:'#ffd25d'}};
 world.window.__game=game;view.render(game);
 assert.ok(lastScene.children.some(m=>m.isInstancedMesh&&m.count>0&&m.userData.readabilityRole==='cue'&&m.material.color.getHexString()==='ffd25d'),'boss warning is visible');
 level.boss.signatureWarning=0;level.boss.strikeTicks=24;view.render(game);
 for(const m of lastScene.children.filter(m=>m.isInstancedMesh))if(m.count)assert.ok(m.instanceMatrix.array.subarray(0,m.count*16).every(Number.isFinite));
}
// Every new enemy/weapon/effect takes the real geometry path, with finite transforms.
for(const type of ['leaper','plated','medic','charger']){
 test.newGame(20);test.state='play';const z=test.makeZombie(300,type,'nola',()=>.5);
 Object.assign(z,{active:true,hp:1,attack:15});test.L.zs=[z];
 for(const w of test.WEAPONS.slice(6)){
  const game={L:test.L,cam:0,frame:200,player:test.p,effects:{barrier:60},weapon:w,flagY:64,bullets:[],spits:[],parts:[{kind:'blast',x:250,y:330,r:78,t:8},{kind:'frostpulse',x:300,y:330,r:145,t:10}],state:'play'};
  world.window.__game=game;view.render(game);
  for(const mesh of lastScene.children.filter(m=>m.isInstancedMesh&&m.count>0))assert.ok(mesh.instanceMatrix.array.subarray(0,mesh.count*16).every(Number.isFinite));
  assert.ok(lastScene.children.filter(m=>m.isInstancedMesh&&m.count>0).length<100);
 }
}
// Safe houses and parade confetti render in all regions, including boss exits.
for(const stage of [0,4,5,9,10,14,15,19,20,24,99]){
 test.newGame(stage);test.L.celebration={ticks:100};const x=test.L.exitX*32;
 const game={L:test.L,cam:Math.max(0,x-500),frame:200,player:test.p,effects:{},weapon:test.WEAPONS[0],flagY:64,bullets:[],spits:[],parts:[{kind:'confetti',x:x+100,y:220,c:'#9a45d2',spin:1,t:60}],state:'clear'};
 const before=JSON.stringify(test.L.grid);world.window.__game=game;view.render(game);assert.equal(JSON.stringify(test.L.grid),before);
 const meshes=lastScene.children.filter(m=>m.isInstancedMesh&&m.count>0);
 for(const color of ['4a2864','f8dfaa','9a45d2','30cb76','ffd25d'])assert.ok(meshes.some(m=>m.material.color.getHexString()===color),'decorated safe-house palette '+color);
 assert.ok(meshes.some(m=>m.userData.readabilityRole==='cue'&&m.material.color.getHexString()==='9a45d2'),'confetti visible');
 for(const mesh of meshes)assert.ok(mesh.instanceMatrix.array.subarray(0,mesh.count*16).every(Number.isFinite));
 assert.ok(meshes.length<100,'safe-house draw calls stay bounded');
}
// Extra modes share the real renderer, including the closed arena at high wave counts.
for(const wave of [1,4,40]){
 test.startSurvival();test.activeRun.wave=wave-1;test.spawnWave();
 const game={L:test.L,cam:0,frame:200,player:test.p,effects:{},weapon:test.WEAPONS[0],flagY:64,bullets:[],spits:[],parts:[],state:'play'};
 world.window.__game=game;view.render(game);
 assert.ok(lastScene.children.filter(m=>m.isInstancedMesh&&m.count>0).length<100);
 for(const m of lastScene.children.filter(m=>m.isInstancedMesh))if(m.count)assert.ok(m.instanceMatrix.array.subarray(0,m.count*16).every(Number.isFinite),'finite survival rendering');
}
test.startDaily('2026-11-16');
const dailyGame={L:test.L,cam:0,frame:200,player:test.p,effects:{},weapon:test.WEAPONS[test.weaponIndex],flagY:64,bullets:[],spits:[],parts:[],state:'play'};
world.window.__game=dailyGame;view.render(dailyGame);
// One visible cake has a baked ring, white icing and six colored sugar sectors.
const savedCakes=dailyGame.L.bolts;
const cake={x:300,y:300,got:false};dailyGame.L.bolts=[cake];view.render(dailyGame);
const cakeMeshes=()=>lastScene.children.filter(m=>m.isInstancedMesh&&m.count>0&&m.geometry.type==='TorusGeometry');
let rings=cakeMeshes();
assert.equal(rings.reduce((n,m)=>n+m.count,0),8);
for(const mesh of rings){
 assert.ok(mesh.geometry.parameters.radius>mesh.geometry.parameters.tube,'center hole stays open');
 assert.equal(mesh.material.emissiveIntensity,0,'pastry is baked and iced, not metallic/glowing');
}
assert.equal(rings.find(m=>m.material.color.getHexString()==='fff3df').count,1,'white icing ring');
for(const color of ['8c35bc','1baf55','f5c52e'])assert.equal(rings.filter(m=>m.material.color.getHexString()===color).reduce((n,m)=>n+m.count,0),2,'alternating sugar sections');
cake.got=true;view.render(dailyGame);assert.equal(cakeMeshes().length,0,'collected cake disappears');
cake.got=false;cake.x=1000;view.render(dailyGame);assert.equal(cakeMeshes().length,0,'offscreen cake is culled');
dailyGame.parts=[{kind:'boltpop',x:300,y:300,t:20}];view.render(dailyGame);
assert.equal(cakeMeshes().reduce((n,m)=>n+m.count,0),8,'crate reward uses the same cake');
dailyGame.parts=[];dailyGame.L.bolts=savedCakes;
// Explicit mixed obstacle/pit/hazard fixture: borders and warning phases remain distinct.
const fixtureGame=world.window.__game;
fixtureGame.L.grid[9].splice(5,8,'H','B','P','p','?','M','U','=');
fixtureGame.parts=[{kind:'powerpop',x:300,y:280,t:30}];fixtureGame.L.grid[12][9]=' ';
fixtureGame.cam=0;
for(const [kind,phase,color] of [['steam',0,'ffad66'],['steam',150,'ffd25d'],['steam',190,'ff6565'],['storm',190,'ff6565'],['thorn',0,'ff6565']]){
 fixtureGame.frame=phase;fixtureGame.L.elements=[{x:320,w:96,kind,phase:0}];world.window.__game=fixtureGame;view.render(fixtureGame);
 const cue=lastScene.children.find(m=>m.isInstancedMesh&&m.count>0&&m.userData.readabilityRole==='cue'&&m.material.color.getHexString()===color);
 assert.ok(cue,kind+' hazard phase '+phase+' is visibly marked');
 assert.ok(lastScene.children.some(m=>m.isInstancedMesh&&m.count>0&&m.userData.readabilityRole==='cue'&&m.material.color.getHexString()==='ffe3a0'),'solid collider frame present');
}
for(const shape of ['BoxGeometry','SphereGeometry','CylinderGeometry','ConeGeometry'])assert.ok(shapeTypes.has(shape),shape);
assert.ok(maxCalls<100,'material batching remains bounded');
const fixture=world.window.__game;
for(const [w,h,dpr] of [[390,218,3],[1280,716,2],[2560,1433,3],[800,448,1]]){
 nodes.c.style.width=w+'px';nodes.c.style.height=h+'px';world.window.devicePixelRatio=dpr;
 view.render(fixture);assert.ok(lastRenderer.width*lastRenderer.height*lastRenderer.ratio**2<=3000001);
 assert.equal(lastRenderer.ratio,Math.min(dpr,2,Math.sqrt(3000000/(w*h))));
}
const maps=new Set(lastScene.children.filter(n=>n.isMesh&&n.material.map).map(n=>n.material.map));
assert.ok(maps.size>=3,'road, brick and sky textures tested');
for(const map of maps){
 assert.equal(map.magFilter,THREE.NearestFilter);assert.equal(map.minFilter,THREE.NearestFilter);
 assert.equal(map.generateMipmaps,false);assert.equal(map.anisotropy,1);
}

nodes.bView.events.click();assert.equal(view.enabled,false);assert.equal(nodes.world3d.hidden,true);
nodes.bView.events.click();assert.equal(view.enabled,true);
let prevented=false;nodes.world3d.events.webglcontextlost({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(view.enabled,false);assert.equal(nodes.bView.disabled,true);
const fallback=boot(true);assert.equal(fallback.view.enabled,false);assert.equal(fallback.nodes.world3d.hidden,true);assert.equal(fallback.nodes.bView.disabled,true);
console.log('PASS: enhanced geometry and finite instance transforms across 100 stages, procedural sky/materials, bounded batches ('+maxCalls+' max), 2D toggle and WebGL failure/context-loss fallback. GPU appearance/performance require browser checks.');

})().catch(error => { console.error(error); process.exitCode = 1; });
