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
  constructor(){lastRenderer=this;this.info={render:{calls:0}};}
  setPixelRatio(value){assert.ok(value<=1.5);}
  setSize(){}
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
 const game={L:level,cam:0,frame:200,player:test.p,effects:{shield:30},weapon:test.WEAPONS[stage%6],flagY:64,
   bullets:[{x:260,y:330,vx:14,vy:0,color:'#ffab65'}],spits:[{x:350,y:330}],parts:[{x:300,y:330,kind:'spark'}],state:'play'};
 world.window.__game=game;view.render(game);
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
for(const shape of ['BoxGeometry','SphereGeometry','CylinderGeometry','ConeGeometry'])assert.ok(shapeTypes.has(shape),shape);
assert.ok(maxCalls<100,'material batching remains bounded');
nodes.bView.events.click();assert.equal(view.enabled,false);assert.equal(nodes.world3d.hidden,true);
nodes.bView.events.click();assert.equal(view.enabled,true);
let prevented=false;nodes.world3d.events.webglcontextlost({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(view.enabled,false);assert.equal(nodes.bView.disabled,true);
const fallback=boot(true);assert.equal(fallback.view.enabled,false);assert.equal(fallback.nodes.world3d.hidden,true);assert.equal(fallback.nodes.bView.disabled,true);
console.log('PASS: enhanced geometry and finite instance transforms across 100 stages, procedural sky/materials, bounded batches ('+maxCalls+' max), 2D toggle and WebGL failure/context-loss fallback. GPU appearance/performance require browser checks.');

})().catch(error => { console.error(error); process.exitCode = 1; });
