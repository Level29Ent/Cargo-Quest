const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
let src=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const store={};const nodes={};
function el(){return {style:{},classList:{add(){},remove(){}},addEventListener(){},getContext(){return {}},replaceChildren(){},append(){},focus(){},hidden:true};}
const sandbox={console,Math,Set,Image:function(){},innerWidth:390,innerHeight:844,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},addEventListener(){},document:{getElementById:id=>nodes[id]??=el(),createElement:()=>el(),querySelectorAll:()=>[]},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v}};
sandbox.window=sandbox;
src=src.replace('window.__game =',`window.test={buildLevel,moveBody,newGame,update,openShop,closeShop,purchasePower,earnCoins,addBolt,killZombie,hurtPlayer,fire,spawnBoss,SHOP_POWERS,
get spits(){return spits},
get wallet(){return wallet},get effects(){return effects},get bullets(){return bullets},get p(){return player},get L(){return L},set L(v){L=v},get state(){return state},set state(v){state=v},get time(){return time},get touch(){return touch},get keys(){return keys},jump(){jumpPressed=true}}; window.__game =`);
vm.runInNewContext(src,sandbox);const t=sandbox.test;
assert.equal(t.SHOP_POWERS.length,8);
t.newGame(0);t.state='play';
assert.equal(t.purchasePower('shield'),false);
t.addBolt(0,0);assert.equal(t.wallet,1);
const z=t.L.zs[0];t.killZombie(z,1);assert.equal(t.wallet,4);t.killZombie(z,1);assert.equal(t.wallet,4);
t.earnCoins(500);
for(const item of t.SHOP_POWERS){if(item.id==='heal')t.p.health=1;const before=t.wallet, time=t.time;assert.equal(t.purchasePower(item.id),true,item.id);assert.equal(t.wallet,before-item.cost);if(item.id==='heal')assert.equal(t.p.health,3);else if(item.id==='time')assert.equal(t.time,time+60);else assert.equal(t.effects[item.id],1800);}
t.p.inv=0;t.hurtPlayer(t.p.x+50);assert.equal(t.p.health,3);
t.fire();assert.equal(t.bullets.at(-1).dmg,2);
const before=t.wallet;t.earnCoins(1);assert.equal(t.wallet,before+2);
t.openShop();const time=t.time, duration=t.effects.shield;for(let i=0;i<120;i++)t.update();assert.equal(t.time,time);assert.equal(t.effects.shield,duration);t.closeShop();
t.L.zs=[];t.L.bolts=[];t.update();assert.equal(t.effects.shield,duration-1);
// Magnet collects a bolt outside the normal pickup radius; freeze holds live enemies and shots.
t.L.bolts=[{x:t.p.x+130,y:t.p.y+30,got:false}];
const magnetWallet=t.wallet;t.update();assert.equal(t.L.bolts[0].got,true);assert.equal(t.wallet,magnetWallet+2);
const frozen=t.buildLevel(0).zs[0];Object.assign(frozen,{x:t.p.x+200,active:true,dead:false,alive:true});t.L.zs=[frozen];
const frozenX=frozen.x,frozenY=frozen.y;t.update();assert.equal(frozen.x,frozenX);assert.equal(frozen.y,frozenY);
const coins=t.wallet;t.newGame(0);assert.equal(t.wallet,coins);assert.equal(Object.keys(t.effects).length,0);assert.equal(Number(store['cargoQuest2.coins']),coins);
// Reproduce a six-tile-high entry with the real collision/jump update, then compare fixed geometry.
function canLand(level,x,startFeet,targetY){
 t.L=level;t.state='play';level.zs=[];level.bolts=[];level.flagX=-1;level.info.isBoss=false;
 const p=t.p;Object.assign(p,{x:x*32-65,y:startFeet-60,vx:3.6,vy:0,onGround:true,coyote:6,health:3,inv:9999});
 t.touch.R=true;t.touch.J=true;t.jump();
 for(let f=0;f<90;f++){if(startFeet===targetY && f===8)t.touch.J=false;t.update();if(p.onGround && p.x+p.w>x*32 && Math.abs(p.y+p.h-targetY)<1){t.touch.R=false;t.touch.J=false;return true;}if(t.state!=='play')break;}
 t.touch.R=false;t.touch.J=false;return false;
}
function fixture(row){const grid=Array.from({length:14},()=>Array(50).fill(' '));for(let x=0;x<50;x++){grid[12][x]='#';grid[13][x]='#';}for(let x=15;x<26;x++){grid[12][x]=' ';grid[13][x]=' ';}for(let x=15;x<18;x++)grid[row][x]='=';return {grid,W:50,zs:[],bolts:[],props:[],info:{...t.buildLevel(0).info},i:0,flagX:-1};}
t.newGame(0);assert.equal(canLand(fixture(6),15,384,192),false,'old high platform must reproduce failure');
t.newGame(0);assert.equal(canLand(fixture(9),15,384,288),true,'fixed entry must be reachable without powers or sprint');
// Boots produce a higher apex, with identical held-jump inputs.
function apex(boots){t.newGame(0);t.state='play';t.L.zs=[];t.L.bolts=[];t.p.y=324;t.p.onGround=true;t.p.vx=0;if(boots)t.purchasePower('boots');t.touch.J=true;t.jump();let min=324;for(let f=0;f<24;f++){t.update();min=Math.min(min,t.p.y);}t.touch.J=false;return min;}
const normalApex=apex(false), bootsApex=apex(true);assert.ok(bootsApex<normalApex-30);
// Freeze affects bosses and hostile shots too, then all timed powers expire in active play.
t.newGame(4);t.state='play';t.earnCoins(100);t.purchasePower('freeze');t.spawnBoss();
const boss=t.L.boss;t.spits.push({x:400,y:200,vx:2,vy:0,t:60});
const bossX=boss.x,bossTimer=boss.timer;t.update();assert.equal(boss.x,bossX);assert.equal(boss.timer,bossTimer);assert.equal(t.spits[0].x,400);assert.equal(t.spits[0].t,60);
boss.dead=true;boss.deadT=69;t.update();assert.ok(t.L.crate,'freeze must not delay the defeated boss reward');
t.newGame(0);t.state='play';t.L.zs=[];t.L.bolts=[];t.earnCoins(200);
for(const item of t.SHOP_POWERS.filter(item=>!['heal','time'].includes(item.id))) t.purchasePower(item.id);
t.purchasePower('shield');assert.equal(t.effects.shield,3600);
for(let i=0;i<1800;i++)t.update();assert.equal(t.effects.shield,1800);
for(const item of t.SHOP_POWERS.filter(item=>!['heal','time','shield'].includes(item.id)))assert.equal(t.effects[item.id],0,item.id+' expiry');
const savedWallet=t.wallet;
vm.runInNewContext(src,sandbox);assert.equal(sandbox.test.wallet,savedWallet,'wallet restored after reload');
let platforms=0, crossings=0;
for(let i=0;i<100;i++){const l=t.buildLevel(i);if(l.info.isBoss)continue;for(let x=0;x<l.W;x++)for(let y=0;y<14;y++)if(l.grid[y][x]==='='){assert.equal(y,9);platforms++;}}
assert.ok(platforms>100);
for(let i=0;i<100;i++){
 const l=t.buildLevel(i);if(l.info.isBoss)continue;
 for(let x=1;x<l.W-3;x++){
  if(l.grid[9][x]!=='=' || l.grid[9][x-1]==='=') continue;
  const fromStreet=l.grid[12][x-1]==='#';
  // Every generated entry and subsequent one-tile platform gap is traversable at walking speed.
  t.newGame(0);
  assert.equal(canLand(l,x,fromStreet?384:288,288),true,'stage '+(i+1)+' platform '+x);
  crossings++;
 }
}
assert.ok(crossings>100);
console.log('PASS: original jump failure reproduced; fixed normal jump lands; '+crossings+' simulated crossings, '+platforms+' platform tiles across 100 stages checked; eight purchases, costs, insufficient funds, shield, double damage/coins, medkit, time refill, persistence, pause and expiry checked.');
