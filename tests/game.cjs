const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.match(html,/canvas\{[^}]*image-rendering:crisp-edges;image-rendering:pixelated;/,'both canvas scaling CSS fallbacks are present');
let src=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const store={};const nodes={};const hudText=[];
const drawing=new Proxy({createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},measureText(text){return {width:String(text).length*8}},setTransform(...args){this.transform=args;},fillText(text){hudText.push(text);}}, {get(target,key){return key in target?target[key]:()=>{};}});
function el(){return {set width(v){this._width=v;drawing.imageSmoothingEnabled=true;},get width(){return this._width},set height(v){this._height=v;drawing.imageSmoothingEnabled=true;},get height(){return this._height},style:{},classList:{add(){},remove(){},toggle(){}},events:{},addEventListener(name,fn){const prev=this.events[name];this.events[name]=prev?e=>{prev(e);fn(e);}:fn;},setPointerCapture(){},getContext(){return drawing},replaceChildren(){},append(){},setAttribute(){},focus(){sandbox.document.activeElement=this;},hidden:true};}
const listeners={};
const sandbox={console,Math,Set,Image:function(){},innerWidth:390,innerHeight:844,performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},addEventListener(name,fn){listeners[name]=fn;},document:{getElementById:id=>nodes[id]??=el(),createElement:()=>el(),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[],addEventListener(name,fn){listeners[name]=fn;}},localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v}};
sandbox.window=sandbox;
src=src.replace('window.__game =',`window.test={updateAdventure,drawAdventure,registerHit,hitBlock,buildLevel,moveBody,newGame,update,openShop,closeShop,purchasePower,earnCoins,addBolt,killZombie,hurtPlayer,fire,spawnBoss,SHOP_POWERS,WEAPONS,selectWeapon,grantPower,COURSES,fit,drawHUD,togglePause,releaseControls,finishStage,updateCargo,dropCargo,equipCosmetic,medalCount,loadCampaign,saveCampaign,updateBoss,targetTicks,openCampaign,closeCampaign,startDaily,startSurvival,dailyContract,finishMode,retryMode,spawnWave,updateSurvival,loadModeRecords,renderFieldGuide,modeStatus,drawScreens,startLevel,drawLevel,drawKingCake,makeZombie,detonate,clearShot,startCelebration,updateClear,loop,
get score(){return score},get popups(){return popups},get clearPhase(){return clearPhase},get gameMode(){return gameMode},get activeRun(){return activeRun},get modeRecords(){return modeRecords},
get campaign(){return campaign},get cosmetics(){return COSMETICS},
get parts(){return parts},
get frame(){return frame},get weaponIndex(){return weaponIndex},set frame(v){frame=v},
get spits(){return spits},
get wallet(){return wallet},get effects(){return effects},get bullets(){return bullets},get p(){return player},get L(){return L},set L(v){L=v},get state(){return state},set state(v){state=v},get time(){return time},get touch(){return touch},get keys(){return keys},jump(){jumpPressed=true}}; window.__game =`);
vm.runInNewContext(src,sandbox);const t=sandbox.test;
assert.equal(t.SHOP_POWERS.length,18);
// The fallback/HUD cake is an open oval, not a filled disc or spinning bolt.
const cakeArcs=[];const originalEllipse=drawing.ellipse;
drawing.ellipse=(...args)=>cakeArcs.push(args);
t.drawKingCake(146,57);
assert.equal(cakeArcs.length,9,'pastry, baked edge, icing and six sugar sections');
for(const arc of cakeArcs){assert.ok(arc.every(Number.isFinite));assert.equal(arc[2],10.5);assert.equal(arc[3],8.5);}
assert.equal(cakeArcs.filter(arc=>arc[6]===Math.PI*2).length,3,'three open stroked rings');
drawing.ellipse=originalEllipse;
assert.match(t.SHOP_POWERS.find(p=>p.id==='magnet').desc,/king cakes/);

const cssWidth=()=>parseFloat(nodes.c.style.width);
const cssHeight=()=>parseFloat(nodes.c.style.height);
for(const [width,height,dpr] of [[390,844,3],[1280,800,2],[2560,1440,3],[800,600,1]]){
 sandbox.innerWidth=width;sandbox.innerHeight=height;sandbox.devicePixelRatio=dpr;drawing.imageSmoothingEnabled=true;t.fit();
 assert.equal(drawing.imageSmoothingEnabled,false,'nearest sprite sampling restored on resize');
 assert.ok(nodes.c.width*nodes.c.height<=3004000,'HUD resolution stays budgeted');
 if(cssWidth()*cssHeight()<=3000000)assert.ok(nodes.c.width>=cssWidth(),'HUD not CSS-upscaled within budget');
 assert.equal(drawing.transform[0],nodes.c.width/800);
 assert.equal(drawing.transform[3],nodes.c.height/448);
 assert.equal(nodes.c.width,Math.round(cssWidth()*Math.min(dpr,2,Math.sqrt(3000000/(cssWidth()*cssHeight())))));
}
sandbox.innerWidth=390;sandbox.innerHeight=844;sandbox.devicePixelRatio=1;t.fit();

t.newGame(0);t.state='play';t.drawHUD();assert.ok(hudText.includes('CARGO QUEST'));assert.ok(!hudText.includes('LEVEL 29'));
assert.equal(t.purchasePower('shield'),false);
t.addBolt(0,0);assert.equal(t.wallet,1);
const z=t.L.zs[0];t.killZombie(z,1);assert.equal(t.wallet,4);t.killZombie(z,1);assert.equal(t.wallet,4);
t.earnCoins(1000);
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
function fixture(row){const grid=Array.from({length:14},()=>Array(50).fill(' '));for(let x=0;x<50;x++){grid[12][x]='#';grid[13][x]='#';}for(let x=15;x<26;x++){grid[12][x]=' ';grid[13][x]=' ';}for(let x=15;x<18;x++)grid[row][x]='=';return {grid,W:50,zs:[],bolts:[],props:[],info:{...t.buildLevel(0).info},i:0,flagX:-1,runTicks:0,cargo:{x:300,y:366,carried:false,delivered:false,lock:0}};}
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
t.newGame(0);t.state='play';t.L.zs=[];t.L.bolts=[];t.earnCoins(400);
for(const item of t.SHOP_POWERS.filter(item=>!['heal','time'].includes(item.id))) t.purchasePower(item.id);
t.purchasePower('shield');assert.equal(t.effects.shield,3600);
for(let i=0;i<1800;i++)t.update();assert.equal(t.effects.shield,1800);
for(const item of t.SHOP_POWERS.filter(item=>!['heal','time','shield'].includes(item.id)))assert.equal(t.effects[item.id],0,item.id+' expiry');
const savedWallet=t.wallet;
const reload={...sandbox,document:{...sandbox.document,getElementById:()=>el(),addEventListener(){}},addEventListener(){}};reload.window=reload;
vm.runInNewContext(src,reload);assert.equal(reload.test.wallet,savedWallet,'wallet restored after reload');
// All weapons have distinct shot patterns, damage, range, cooldown, color and/or status effects.
t.newGame(0);t.state='play';
assert.equal(t.WEAPONS.length,9);
const shotSignatures=new Set();
for(let i=0;i<t.WEAPONS.length;i++){
 t.selectWeapon(i);const weapon=t.WEAPONS[i], before=t.bullets.length;t.fire();
 const emitted=t.bullets.slice(before);assert.equal(emitted.length,weapon.pellets);
 assert.equal(emitted[0].dmg,weapon.damage);assert.equal(emitted[0].life,weapon.life);
 assert.equal(emitted[0].vx,weapon.speed);assert.equal(t.p.fireCd,weapon.delay);
 if(weapon.slow)assert.equal(emitted[0].slow,true);
 shotSignatures.add(JSON.stringify([emitted.length,emitted[0].dmg,emitted[0].life,t.p.fireCd]));
}
assert.equal(shotSignatures.size,9);t.selectWeapon(100);assert.equal(t.weaponIndex,8);
function cleanRun(stage=0){t.newGame(stage);t.state='play';t.L.zs=[];t.L.bolts=[];t.L.pickups=[];t.L.elements=[];t.p.onGround=true;t.p.y=324;t.p.inv=0;}
cleanRun();t.grantPower('vampire');t.p.health=1;
for(let i=0;i<3;i++)t.killZombie({dead:false,active:false,pts:100,x:500,y:320,w:24,h:60},1);
assert.equal(t.p.health,2,'vampire heal every third defeat');
cleanRun();t.grantPower('regen');t.p.health=1;for(let f=0;f<300;f++)t.update();assert.equal(t.p.health,2);
cleanRun();t.grantPower('coolant');t.p.heat=99;t.p.overheat=true;t.update();t.fire();assert.equal(t.p.heat,0);assert.equal(t.p.overheat,false);
cleanRun();t.grantPower('rescue');t.p.y=600;t.update();assert.equal(t.state,'play');assert.equal(t.effects.rescue,0);assert.equal(t.p.y,324);
cleanRun();t.grantPower('frost');t.fire();assert.equal(t.bullets.at(-1).slow,true);
const slowed={alive:true,active:true,dead:false,flash:0,x:155,y:324,w:26,h:60,vx:0,vy:0,hp:20,speed:1,dir:-1,anim:0,type:'walker',pts:100};
t.L.zs=[slowed];t.update();assert.equal(slowed.slow,180,'cryo ammo applies on hit');t.update();assert.ok(Math.abs(slowed.vx)<.5,'hit enemy actually slows');
cleanRun();t.selectWeapon(2);t.fire();assert.equal(t.bullets.at(-1).pierce,5);
function velocity(haste){cleanRun();if(haste)t.grantPower('haste');t.touch.R=true;for(let f=0;f<18;f++)t.update();t.touch.R=false;return t.p.vx;}
assert.ok(velocity(true)>velocity(false));
// Free caches award a real effect and cannot be collected repeatedly.
cleanRun();t.L.pickups=[{x:t.p.x+12,y:t.p.y+30,id:'shield',got:false}];t.update();assert.equal(t.effects.shield,1800);t.update();assert.equal(t.effects.shield,1799);
const identities=new Set();const courseTypes=new Set();
for(let i=0;i<100;i++){
 const level=t.buildLevel(i);courseTypes.add(level.info.course.element);
 identities.add(JSON.stringify([level.grid,level.elements,level.info.course.name]));
 assert.ok(level.elements.length>0,'elements present on stage '+i);
 for(const e of level.elements)for(let k=0;k<3;k++)assert.equal(level.grid[12][e.x/32+k],'#','no hazard on a pit');
 assert.ok(level.pickups[0].y>=288);
}
assert.equal(identities.size,100,'all 100 stage configurations differ');assert.equal(courseTypes.size,10);
function region(kind,phase=0){t.L.elements=[{x:64,w:128,kind,phase}];}
cleanRun(1);region('spring');t.update();assert.equal(t.p.vy,-15);
cleanRun(2);region('steam');t.frame=180;t.update();assert.equal(t.p.health,2);
cleanRun(2);region('steam');t.frame=140;t.update();assert.equal(t.p.health,3,'vent warning is harmless');
cleanRun(7);region('thorn');t.update();assert.equal(t.p.health,2);
cleanRun(9);region('storm');t.frame=180;t.update();assert.equal(t.p.health,2);
function brake(kind){cleanRun();region(kind);t.p.vx=3;t.update();return t.p.vx;}
assert.ok(brake('ice')>brake('supply'));
function groundSpeed(kind){cleanRun();region(kind);t.touch.R=true;for(let f=0;f<10;f++)t.update();t.touch.R=false;return t.p.vx;}
assert.ok(groundSpeed('water')<groundSpeed('supply'));
cleanRun(5);region('belt');const oldX=t.p.x;t.update();assert.equal(t.p.x,oldX+1);
function airborne(stage){cleanRun(stage);t.L.info.course=t.COURSES[stage];t.p.onGround=false;t.p.y=250;t.p.vy=-5;t.touch.J=true;t.update();t.touch.J=false;return t.p.vy;}
assert.ok(airborne(6)<airborne(0));assert.ok(airborne(3)<airborne(0));
// Responsiveness targets at the unchanged 3.6px/frame walking speed.
cleanRun();for(let f=0;f<30;f++){t.update();assert.equal(t.p.onGround,true,'stable subpixel floor contact');}
cleanRun();t.touch.R=true;for(let f=0;f<8;f++)t.update();assert.equal(t.p.vx,3.6,'reach walk speed in eight ticks');
t.touch.R=false;const brakingX=t.p.x;for(let f=0;f<8;f++)t.update();assert.equal(t.p.vx,0);assert.ok(t.p.x-brakingX<12,'short grounded stopping distance');
cleanRun();t.p.vx=3.6;t.touch.L=true;for(let f=0;f<6;f++)t.update();assert.ok(t.p.vx<0,'reverse direction promptly');t.releaseControls();
// Coyote grace still accepts a late press, but not an unlimited air jump.
cleanRun();t.p.onGround=false;t.p.y=300;t.p.vy=1;t.p.coyote=7;t.touch.J=true;t.jump();t.update();assert.ok(t.p.vy<0,'late edge jump accepted');t.releaseControls();
cleanRun();t.p.onGround=false;t.p.y=250;t.p.vy=1;t.p.coyote=0;t.touch.J=true;t.jump();t.update();assert.ok(t.p.vy>0,'no extra jump without upgrade');t.releaseControls();
// Jump shortly before landing queues the next takeoff (must not be swallowed).
cleanRun();t.p.onGround=false;t.p.y=318;t.p.vy=3;t.p.coyote=0;t.touch.J=true;t.jump();
for(let f=0;f<6;f++)t.update();assert.ok(t.p.vy<0,'buffered landing jump fired');t.releaseControls();
// Independent pointer ownership: releasing fire cannot cancel movement or another finger on move.
cleanRun();const press=id=>({pointerId:id,preventDefault(){}});
nodes.bR.events.pointerdown(press(11));nodes.bR.events.pointerdown(press(12));nodes.bF.events.pointerdown(press(13));
assert.equal(t.touch.R,true);assert.equal(t.touch.F,true);
nodes.bR.events.pointerup(press(11));assert.equal(t.touch.R,true);
nodes.bF.events.pointercancel(press(13));assert.equal(t.touch.F,false);assert.equal(t.touch.R,true);
nodes.bR.events.lostpointercapture(press(12));assert.equal(t.touch.R,false);
// Focus loss releases all inputs and pauses the live simulation, timers included.
nodes.bR.events.pointerdown(press(21));t.keys.f=true;listeners.blur();assert.equal(t.state,'pause');assert.equal(t.touch.R,false);assert.equal(t.keys.f,false);
const pausedTime=t.time,pausedX=t.p.x,pausedFrame=t.frame;for(let i=0;i<90;i++)t.update();assert.equal(t.time,pausedTime);assert.equal(t.p.x,pausedX);assert.equal(t.frame,pausedFrame);
t.togglePause();assert.equal(t.state,'play');assert.equal(t.touch.R,false);
nodes.bF.events.pointerdown(press(22));sandbox.document.hidden=true;listeners.visibilitychange();assert.equal(t.state,'pause');assert.equal(t.touch.F,false);sandbox.document.hidden=false;
// Hit confirmation, damage feedback and landing dust do not alter health/damage balance.
cleanRun();const hitEnemy={alive:true,active:true,dead:false,flash:0,x:155,y:324,w:26,h:60,vx:0,vy:0,hp:20,speed:0,dir:-1,anim:0,type:'walker',pts:100};t.L.zs=[hitEnemy];t.fire();t.update();assert.ok(t.p.hitMark>0);assert.ok(hitEnemy.hp<20);
cleanRun();t.hurtPlayer(t.p.x+100);assert.equal(t.p.hurtFlash,12);assert.equal(t.p.health,2);
cleanRun();t.p.onGround=false;t.p.y=315;t.p.vy=9;t.update();assert.ok(t.parts.some(part=>part.kind==='puff'),'landing dust emitted');
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
console.log('PASS: original jump failure reproduced; fixed normal jump lands; '+crossings+' simulated crossings, '+platforms+' platform tiles across 100 stages checked; nine weapon patterns, 18 powers, 10 course mechanics, 100 distinct stage configurations, costs, persistence, pause and expiry checked.');

// Cargo contracts and campaign medals are independent, idempotent and persisted.
t.campaign.stages={};t.saveCampaign();
t.newGame(0);t.L.runTicks=t.targetTicks()+1;const noCargoWallet=t.wallet;t.finishStage();
assert.equal(t.campaign.stages[0].clear,true);assert.equal(t.campaign.stages[0].speed,false);assert.equal(t.campaign.stages[0].cargo,false);assert.equal(t.wallet,noCargoWallet);
t.newGame(0);t.L.runTicks=600;t.L.cargo.carried=true;const deliveryWallet=t.wallet;t.finishStage();
assert.equal(t.campaign.stages[0].speed,true);assert.equal(t.campaign.stages[0].cargo,true);assert.equal(t.campaign.stages[0].grade,'GOLD');assert.equal(t.wallet,deliveryWallet+25);assert.equal(t.medalCount(),3);
t.finishStage();assert.equal(t.wallet,deliveryWallet+25,'cannot double reward in same attempt');
t.newGame(0);t.L.runTicks=99999;t.L.cargo.carried=true;t.finishStage();assert.equal(t.wallet,deliveryWallet+25,'replay cannot farm delivery bonus');assert.equal(t.campaign.stages[0].grade,'GOLD','never overwrite a better rating');assert.equal(t.campaign.stages[0].ticks,600);
t.newGame(1);t.L.runTicks=t.targetTicks()+20;t.L.cargo.carried=true;t.finishStage();assert.equal(t.campaign.stages[1].grade,'SILVER');assert.equal(t.campaign.stages[1].speed,false);
assert.equal(t.campaign.stage,2);const restored=t.loadCampaign();assert.equal(restored.stage,2);assert.equal(restored.stages[0].ticks,600);assert.equal(restored.stages[1].cargo,true);
assert.equal(t.equipCosmetic('courier'),true);assert.equal(t.equipCosmetic('royal'),false);assert.equal(t.equipCosmetic('not-real'),false);assert.equal(t.loadCampaign().equipped.outfit,'courier');
// All reward tiers unlock on actual medal counts, without spending wallet or changing stats.
const cosmeticWallet=t.wallet;t.campaign.stages={};for(let i=0;i<15;i++)t.campaign.stages[i]={clear:true,speed:true,cargo:true,ticks:500,grade:'GOLD'};
for(const item of t.cosmetics)assert.equal(t.equipCosmetic(item.id),true,item.id);assert.equal(t.wallet,cosmeticWallet);
t.newGame(10);assert.equal(t.p.health,4,'only existing boss armor affects health, not outfit');
// Loading rejects invalid stages, scores, medal flags and locked cosmetic selections.
store['cargoQuest2.campaign.v1']=JSON.stringify({version:1,stage:999,best:-1,stages:{0:{clear:'yes',speed:false,cargo:false,ticks:-5}},equipped:{outfit:'royal'}});
const sanitized=t.loadCampaign();assert.equal(sanitized.stage,0);assert.equal(sanitized.best,0);assert.equal(sanitized.stages[0].clear,false);assert.equal(sanitized.stages[0].ticks,null);assert.equal(sanitized.equipped.outfit,'classic');
store['cargoQuest2.campaign.v1']='broken json';assert.equal(t.loadCampaign().stage,0);t.saveCampaign();
// Browser storage failures leave gameplay usable in-session.
const setItem=sandbox.localStorage.setItem;sandbox.localStorage.setItem=()=>{throw Error('storage blocked')};t.newGame(0);t.L.cargo.carried=true;t.L.runTicks=100;t.finishStage();assert.equal(t.campaign.stages[0].clear,true);sandbox.localStorage.setItem=setItem;t.saveCampaign();
// Cargo pickup, theft and recovery use a safe ground position; opening dispatch freezes the timer.
cleanRun();Object.assign(t.L.cargo,{x:t.p.x+12,y:t.p.y+30});t.updateCargo();assert.equal(t.L.cargo.carried,true);
const thief={};t.p.safeX=96;t.dropCargo(thief);assert.equal(t.L.cargo.carried,false);assert.equal(t.L.cargo.x,96);assert.equal(thief.flee,120);assert.equal(t.L.cargo.lock,60);
t.updateCargo();assert.equal(t.L.cargo.carried,false,'theft cannot instantly recollect');for(let n=0;n<60;n++)t.updateCargo();assert.equal(t.L.cargo.carried,true);
t.openCampaign();const dispatchTicks=t.L.runTicks,dispatchFrame=t.frame;for(let n=0;n<100;n++)t.update();assert.equal(t.L.runTicks,dispatchTicks);assert.equal(t.frame,dispatchFrame);t.closeCampaign();
// Cargo placement and tactical variants exist across the campaign without altering pit platforms.
const variants=new Set();let perched=0;
for(let i=0;i<100;i++){
 const l=t.buildLevel(i),x=Math.floor(l.cargo.x/32);assert.equal(l.grid[12][x],'#','cargo on street '+i);assert.equal(l.grid[11][x],' ','cargo not inside a solid '+i);
 assert.equal(l.cargo.carried,false);assert.equal(l.runTicks,0);
 for(const z of l.zs){variants.add(z.type);if(z.type==='thrower'){assert.notEqual(l.grid[8][Math.floor(z.x/32)],' ');perched++;}}
}
for(const kind of ['shield','thief','thrower','leaper','plated','medic'])assert.ok(variants.has(kind));assert.ok(perched>0);
// Shield blocks the first frontal round, then visibly staggers; rear shots deal damage.
function enemy(type){return {alive:true,active:true,dead:false,flash:0,x:155,y:324,w:26,h:60,vx:0,vy:0,hp:20,maxHp:20,speed:0,dir:-1,anim:0,type,pts:100,onGround:true,attack:1};}
cleanRun();const guard=enemy('shield');t.L.zs=[guard];t.fire();t.update();assert.equal(guard.hp,20);assert.equal(guard.guardBreak,45);t.fire();t.update();assert.ok(guard.hp<20,'follow-up hits staggered shield');
cleanRun();const rear=enemy('shield');rear.x=105;t.p.x=155;t.p.face=-1;t.L.zs=[rear];rear.onGround=false;rear.dir=-1;t.fire();t.update();assert.ok(rear.hp<20,'rear attack bypasses shield');
cleanRun();const lobber=enemy('thrower');lobber.x=400;t.L.zs=[lobber];t.update();assert.ok(t.spits.length>0,'thrower emits a hostile projectile');
cleanRun();const cargoThief=enemy('thief');cargoThief.x=t.p.x;cargoThief.y=t.p.y;cargoThief.speed=0;t.L.zs=[cargoThief];t.L.cargo.carried=true;t.update();assert.equal(t.L.cargo.carried,false,'thief collision drops cargo');
// Lost cargo remains recoverable even when the last safe position is behind the camera.
cleanRun();t.p.x=1200;t.p.safeX=96;t.L.cargo.carried=true;t.update();t.dropCargo({});assert.ok(t.L.cargo.x>=sandbox.__game.cam,'cargo is not behind the one-way camera');
// Real flag and boss-reward collision paths award medals, not merely direct helper calls.
cleanRun();t.campaign.stages={};t.p.x=t.L.flagX*32-28;t.L.cargo.carried=true;t.update();assert.equal(t.state,'clear');assert.equal(t.campaign.stages[0].cargo,true);assert.equal(t.L.recorded,true);
cleanRun(4);t.campaign.stages={};t.L.cargo.carried=true;t.L.crate={x:t.p.x,y:324,w:32,h:32,onGround:true};t.update();assert.equal(t.state,'clear');assert.equal(t.campaign.stages[4].clear,true);assert.equal(t.campaign.stages[4].cargo,true);
// Each region has a distinct signature, with a full second of harmless warning.
const signatures=new Set();
for(const stage of [4,9,14,19,24]){
 cleanRun(stage);t.spawnBoss();const b=t.L.boss;b.mode='walk';b.signatureCd=0;b.onGround=true;
 t.updateBoss();assert.equal(b.signatureWarning,60);assert.equal(t.spits.length,0);const health=t.p.health;
 t.openShop();for(let n=0;n<90;n++)t.update();assert.equal(b.signatureWarning,60,'shopping freezes boss warning');t.closeShop();
 for(let n=0;n<59;n++)t.updateBoss();assert.equal(b.signatureWarning,1);assert.equal(t.spits.length,0);assert.equal(t.p.health,health);
 t.updateBoss();
 const id=t.L.info.loc.id;signatures.add(id);
 if(id==='nola')assert.ok(t.L.zs.length>=2,'voodoo summons');
 if(id==='la')assert.equal(b.mode,'signatureDash');
 if(id==='hou')assert.ok(t.spits.every(s=>s.wave));
 if(id==='lej')assert.equal(t.spits.length,3);
 if(id==='pi'){assert.equal(b.strikeTicks,24);assert.equal(b.targets.length,3);}
 b.hp=b.maxHp*.3;b.signatureWarning=1;t.updateBoss();assert.equal(b.signatureCd,240,'enraged cadence is faster');
 if(id==='pi')assert.equal(b.strikeTicks,35);
}
assert.equal(signatures.size,5);
console.log('PASS: cargo recovery/delivery and reward idempotency, independent medals, save validation/reload/storage failure, all cosmetic tiers, dispatch pause, tactical enemies, and five warned/enraged boss signatures.');
// Daily Dispatch has stable date-based routes, a locked loadout and no campaign/economy side effects.
const originalCampaign=JSON.stringify(t.campaign),originalWallet=t.wallet,originalCoinSave=store['cargoQuest2.coins'];
const daily=t.dailyContract('2026-11-16');assert.equal(JSON.stringify(daily),JSON.stringify(t.dailyContract('2026-11-16')));
assert.equal(daily.day,'2026-11-16');assert.notEqual(daily.stage%5,4,'daily never selects a boss');
const dailyRoutes=new Set();for(let n=1;n<=28;n++){const d=t.dailyContract('2026-11-'+String(n).padStart(2,'0'));dailyRoutes.add(d.stage+':'+d.weapon);assert.notEqual(d.stage%5,4);assert.ok(d.weapon>=0&&d.weapon<6);}assert.ok(dailyRoutes.size>10);
t.startDaily('2026-11-16');assert.equal(t.gameMode,'daily');assert.equal(t.weaponIndex,daily.weapon);assert.equal(t.p.health,3);assert.equal(t.L.pickups.length,0);assert.equal(t.L.i,daily.stage);
t.selectWeapon((daily.weapon+1)%6);assert.equal(t.weaponIndex,daily.weapon);t.selectWeapon(daily.weapon);assert.match(nodes.bWeapon.textContent,/DAILY LOCKED/);
t.state='play';assert.equal(t.purchasePower('shield'),false);t.openShop();assert.equal(nodes.shop.hidden,true);t.earnCoins(100);assert.equal(t.wallet,originalWallet);
t.addBolt(0,0);assert.equal(store['cargoQuest2.coins'],originalCoinSave);assert.equal(JSON.stringify(t.campaign),originalCampaign);
// A missed-cargo clear cannot replace a good delivery time; retries pin their original UTC day.
t.L.runTicks=1000;t.L.cargo.carried=true;t.finishStage();assert.equal(t.state,'result');assert.equal(t.modeRecords.daily[daily.day].ticks,1000);assert.equal(t.modeRecords.daily[daily.day].cargo,true);
const resultRecord=JSON.stringify(t.modeRecords);t.finishMode(true);assert.equal(JSON.stringify(t.modeRecords),resultRecord);t.drawScreens();assert.ok(hudText.includes('CARGO DELIVERED'));
t.retryMode();assert.equal(t.activeRun.day,daily.day);assert.equal(t.state,'intro');t.L.runTicks=2000;t.L.cargo.carried=false;t.finishStage();assert.equal(t.modeRecords.daily[daily.day].ticks,1000);assert.equal(t.modeRecords.daily[daily.day].cargo,true);
t.startDaily('2026-11-17');t.state='play';t.L.zs=[];t.L.elements=[];t.L.pickups=[];t.L.cargo.carried=true;t.p.x=t.L.flagX*32-28;t.update();assert.equal(t.state,'clear','daily first walks to the safe house');for(let n=0;n<900 && t.state==='clear';n++)t.update();assert.equal(t.state,'result','daily celebration returns to its result, never campaign');
assert.equal(JSON.stringify(t.campaign),originalCampaign);assert.equal(t.wallet,originalWallet);
// Daily failure, pause, retries and restart all keep campaign isolated.
t.startDaily('2026-11-18');t.state='play';t.L.zs=[];t.p.health=1;t.p.inv=0;t.hurtPlayer(t.p.x+10);assert.equal(t.state,'dying');for(let f=0;f<160;f++)t.update();assert.equal(t.state,'result');assert.equal(t.modeRecords.daily['2026-11-18'],undefined);
t.retryMode();t.state='play';t.openCampaign();const dailyTicks=t.L.runTicks;for(let n=0;n<30;n++)t.update();assert.equal(t.L.runTicks,dailyTicks);t.closeCampaign();
// Survival is a closed, pit-free arena with telegraphed, capped waves and no stage timeout.
t.startSurvival();assert.equal(t.gameMode,'survival');assert.equal(t.p.health,3);assert.equal(t.L.W,25);assert.equal(t.L.flagX,-1);assert.equal(t.L.zs.length,0);assert.equal(t.p.x,384);
for(let x=0;x<25;x++)assert.equal(t.L.grid[12][x],'#');for(let y=0;y<12;y++){assert.equal(t.L.grid[y][0],'H');assert.equal(t.L.grid[y][24],'H');}
t.state='play';t.openCampaign();const initialBreak=t.activeRun.breakTicks;for(let n=0;n<150;n++)t.update();assert.equal(t.activeRun.breakTicks,initialBreak);t.closeCampaign();
for(let n=0;n<119;n++)t.update();assert.equal(t.L.zs.length,0);t.update();assert.equal(t.activeRun.wave,1);assert.equal(t.L.zs.length,5);assert.ok(t.L.zs.every(z=>Math.abs(z.x-t.p.x)>180));assert.match(t.modeStatus(),/WAVE 1/);
for(let n=0;n<10;n++)t.update();assert.equal(t.time,999);assert.equal(sandbox.__game.cam,0);
t.L.zs.forEach(z=>z.dead=true);t.p.health=1;t.spits.push({x:200,y:300});t.updateSurvival();assert.equal(t.activeRun.completed,1);assert.equal(t.p.health,2);assert.equal(t.spits.length,0);assert.equal(t.modeRecords.survival.wave,1);assert.equal(t.activeRun.breakTicks,120);
// Advance many waves: counts and scaling remain bounded; third-wave reward is a real timed power.
for(let wave=2;wave<=40;wave++){
 t.spawnWave();assert.equal(t.activeRun.wave,wave);assert.ok(t.L.zs.length<=18);assert.ok(t.L.zs.every(z=>Number.isFinite(z.hp)&&Number.isFinite(z.speed)));
 t.L.zs.forEach(z=>z.dead=true);t.updateSurvival();if(wave%3===0)assert.equal(t.effects.coolant,600);
}
assert.equal(t.modeRecords.survival.wave,40);t.state='play';t.p.health=1;t.p.inv=0;t.hurtPlayer(t.p.x+10);for(let n=0;n<160;n++)t.update();assert.equal(t.state,'result');assert.match(t.activeRun.result,/40 WAVES/);assert.equal(t.wallet,originalWallet);assert.equal(JSON.stringify(t.campaign),originalCampaign);
const restoredModes=t.loadModeRecords();assert.equal(restoredModes.survival.wave,40);assert.equal(restoredModes.daily[daily.day].ticks,1000);
// Limit daily history to 30 entries and sanitize malformed local records.
for(let i=1;i<=31;i++){t.startDaily('2026-12-'+String(i).padStart(2,'0'));t.L.cargo.carried=true;t.L.runTicks=i;t.finishMode(true);}assert.equal(Object.keys(t.modeRecords.daily).length,30);
store['cargoQuest2.modes.v1']=JSON.stringify({version:1,survival:{wave:-5,score:'bad'},daily:{'2026-11-16':{ticks:-2,cargo:'true',score:-1},'bad-key':{ticks:3}}});
const cleanRecords=t.loadModeRecords();assert.equal(cleanRecords.survival.wave,0);assert.equal(cleanRecords.daily['2026-11-16'].ticks,null);assert.equal(cleanRecords.daily['2026-11-16'].cargo,false);assert.equal(cleanRecords.daily['bad-key'],undefined);
store['cargoQuest2.modes.v1']='invalid json';assert.equal(t.loadModeRecords().survival.wave,0);
const saveMode=sandbox.localStorage.setItem;sandbox.localStorage.setItem=()=>{throw Error('blocked')};t.startSurvival();t.activeRun.completed=3;t.finishMode();assert.equal(t.state,'result');sandbox.localStorage.setItem=saveMode;
// Returning to campaign restores normal weapon selection, shopping and earning.
t.newGame(0);t.state='play';t.selectWeapon(5);assert.equal(t.gameMode,'campaign');assert.equal(t.weaponIndex,5);t.earnCoins(1);assert.equal(t.wallet,originalWallet+1);t.openShop();assert.equal(nodes.shop.hidden,false);t.closeShop();
t.renderFieldGuide();
console.log('PASS: daily routes/loadout/retry/death/results, isolated saves and economy, capped survival waves/healing/coolant/pause/records, bounded history and malformed/blocked storage.');
// Audit regressions: exercise actual update and input boundaries, not only helpers.
const auditFailures=[];
function audit(name,fn){try{fn();console.log('PASS audit: '+name);}catch(e){auditFailures.push(name+': '+e.message);}}
audit('fatal damage cannot become a campaign clear',()=>{
 cleanRun();t.campaign.stages={};t.p.x=t.L.flagX*32-28;t.p.health=1;t.p.inv=0;
 const z=enemy('walker');Object.assign(z,{x:t.p.x,y:t.p.y,speed:0});t.L.zs=[z];t.update();
 assert.equal(t.state,'dying');assert.equal(t.campaign.stages[0],undefined);
});
audit('fatal damage cannot become a daily delivery',()=>{
 t.startDaily('2026-10-01');t.state='play';t.L.elements=[];t.p.x=t.L.flagX*32-28;t.p.y=324;t.p.onGround=true;t.p.health=1;t.p.inv=0;t.L.cargo.carried=true;
 const z=enemy('walker');Object.assign(z,{x:t.p.x,y:t.p.y,speed:0});t.L.zs=[z];t.update();
 assert.equal(t.state,'dying');assert.equal(t.modeRecords.daily['2026-10-01'],undefined);
});
audit('fatal damage cannot be healed by the boss reward',()=>{
 cleanRun(4);t.campaign.stages={};t.p.health=1;t.p.inv=0;t.L.crate={x:t.p.x,y:324,w:32,h:32,onGround:true};
 t.spits.push({x:t.p.x+12,y:350,vx:0,vy:0,t:20});t.update();assert.equal(t.state,'dying');assert.equal(t.campaign.stages[4],undefined);
});
audit('paused DOM button activation never resumes or shoots the game',()=>{
 cleanRun();t.togglePause();const button={tagName:'BUTTON',closest:()=>({})};
 listeners.keydown({key:'Enter',target:button,preventDefault(){},repeat:false});assert.equal(t.state,'pause');
 listeners.keydown({key:' ',target:button,preventDefault(){},repeat:false});assert.ok(!t.keys[' ']);
});
audit('mode restart preserves the first survival controls',()=>{
 t.startSurvival();t.state='play';listeners.keydown({key:'r',preventDefault(){},repeat:false});assert.equal(t.gameMode,'survival');assert.equal(t.activeRun.wave,0);assert.equal(t.state,'intro');
});
audit('new campaign starts reset stale hazard phases',()=>{
 cleanRun(2);t.frame=500;t.newGame(2);const firstFrame=t.frame;t.frame=9999;t.newGame(2);assert.equal(t.frame,firstFrame);
});
audit('piercing shots hit each boss only once',()=>{
 cleanRun(4);t.spawnBoss();const b=t.L.boss;Object.assign(b,{x:170,y:284,mode:'spit',timer:500,speed:0});t.p.x=96;t.selectWeapon(2);t.fire();
 t.bullets[0].x=171;t.bullets[0].originX=171;t.bullets[0].vx=1;const hp=b.hp;for(let n=0;n<3;n++)t.update();assert.equal(hp-b.hp,5);
});
audit('bullets stop at the nearest enemy, not roster order',()=>{
 cleanRun();const far=enemy('walker'),near=enemy('walker');Object.assign(far,{x:160,w:26,speed:0});Object.assign(near,{x:150,w:26,speed:0});t.L.zs=[far,near];
 t.fire();t.bullets[0].x=151;t.bullets[0].originX=151;t.bullets[0].vx=14;t.update();assert.ok(near.hp<20);assert.equal(far.hp,20);
});
audit('daily cargo pickup at the flag uses the final moved position',()=>{
 t.startDaily('2027-10-02');t.state='play';t.L.zs=[];t.L.elements=[];t.p.x=t.L.flagX*32-29;t.p.y=324;t.p.vx=3.6;t.p.onGround=true;t.touch.R=true;
 t.L.cargo.x=t.p.x+12+31;t.L.cargo.y=354;t.update();assert.equal(t.state,'clear');assert.equal(t.modeRecords.daily['2027-10-02'].cargo,true);t.releaseControls();
});
audit('a killing shot on the last arena enemy records its cleared wave immediately',()=>{
 t.startSurvival();t.state='play';t.spawnWave();const z=enemy('walker');Object.assign(z,{x:155,hp:1});t.L.zs=[z];t.p.x=96;
 t.fire();t.update();assert.equal(z.dead,true);assert.equal(t.activeRun.completed,1);assert.equal(t.activeRun.breakTicks,120);
});
audit('point-blank shots hit the enemy between player and gun muzzle',()=>{
 cleanRun();const z=enemy('walker');z.x=t.p.x+t.p.w+4;t.L.zs=[z];t.fire();t.update();assert.ok(z.hp<20);
});
audit('shots cannot be born beyond a wall at point-blank range',()=>{
 cleanRun();t.L.grid[10][4]='H';t.L.grid[11][4]='H';const z=enemy('walker');z.x=165;t.L.zs=[z];t.fire();t.update();assert.equal(z.hp,20);assert.equal(t.bullets.length,0);
});
audit('full 2D draw remains callable for all generated stages and new modes',()=>{
 for(let i=0;i<100;i++){t.newGame(i);t.state='play';t.drawLevel();t.drawHUD();}
 t.startDaily('2027-11-16');t.state='play';t.drawLevel();t.drawHUD();t.startSurvival();t.state='play';t.spawnWave();t.drawLevel();t.drawHUD();
});
audit('pointer HUD clicks restore jump focus without double toggling pause',()=>{
 cleanRun();nodes.bPause.events.click({detail:1});assert.equal(t.state,'pause');assert.equal(sandbox.document.activeElement,nodes.c);
 nodes.bPause.events.click({detail:1});assert.equal(t.state,'play');assert.equal(sandbox.document.activeElement,nodes.c);
 nodes.bWeapon.events.click({detail:1});assert.equal(t.weaponIndex,1);assert.equal(sandbox.document.activeElement,nodes.c);
});
audit('shots retain collision on their final lifetime tick',()=>{
 cleanRun();const z=enemy('walker');Object.assign(z,{x:155,speed:0});t.L.zs=[z];t.fire();t.bullets[0].life=1;t.update();assert.ok(z.hp<20);assert.equal(t.bullets.length,0);
});
audit('fatal street hazard wins over a healing pickup and finish flag',()=>{
 cleanRun(7);t.p.x=t.L.flagX*32-28;t.p.health=1;t.p.inv=0;t.L.elements=[{x:t.p.x,w:64,kind:'thorn',phase:0}];t.L.pickups=[{x:t.p.x+12,y:354,id:'heal',got:false}];
 t.update();assert.equal(t.state,'dying');assert.equal(t.p.health,0);assert.equal(t.L.pickups[0].got,false);
});
audit('left-facing close shots and fast shots use the swept path',()=>{
 cleanRun();t.p.x=200;t.p.face=-1;const z=enemy('walker');Object.assign(z,{x:165,speed:0});t.L.zs=[z];t.fire();t.update();assert.ok(z.hp<20);
 cleanRun();const fastTarget=enemy('walker');Object.assign(fastTarget,{x:200,w:12,speed:0});t.L.zs=[fastTarget];t.fire();t.bullets[0].vx=150;t.update();assert.ok(fastTarget.hp<20,'fast projectile does not tunnel through a narrow target');
});
function combatRoom(){
 cleanRun();t.L.grid=Array.from({length:14},(_,y)=>Array(50).fill(y>=12?'#':' '));t.L.W=50;t.L.flagX=-1;t.L.info.isBoss=false;
}
audit('new powers have distinct effects, consume or expire, and respect pause',()=>{
 combatRoom();t.grantPower('barrier');t.hurtPlayer(200);assert.equal(t.p.health,3);assert.equal(t.effects.barrier,0);assert.equal(t.p.inv,45);
 t.p.inv=0;t.hurtPlayer(200);assert.equal(t.p.health,2,'ward only blocks once');
 combatRoom();t.grantPower('airhop');t.p.onGround=false;t.p.coyote=0;t.p.y=240;t.touch.J=true;t.jump();t.update();assert.ok(t.p.vy<-9);assert.equal(t.p.dblUsed,true);
 t.touch.J=false;t.update();t.touch.J=true;t.jump();t.update();assert.ok(t.p.vy>-9,'air step cannot be spammed');
 combatRoom();t.selectWeapon(1);t.fire();const heat=t.p.heat,spread=t.bullets[0].vy;
 t.p.heat=0;t.grantPower('focus');t.fire();assert.equal(t.p.heat,heat/2);assert.equal(t.bullets.at(-5).vy,spread/2);
 combatRoom();const target=enemy('walker');target.x=200;t.L.zs=[target];t.grantPower('pulse');t.effects.pulse=121;t.update();assert.ok(target.slow>=179);
 const duration=t.effects.pulse;t.openShop();for(let i=0;i<150;i++)t.update();assert.equal(t.effects.pulse,duration);t.closeShop();
 combatRoom();const blocked=enemy('walker');blocked.x=210;t.L.zs=[blocked];t.L.grid[10][5]='H';t.L.grid[11][5]='H';t.effects.pulse=121;t.update();assert.ok(!blocked.slow,'pulse cannot cross a wall');
 combatRoom();t.effects.airhop=1;t.update();assert.equal(t.effects.airhop,0);
});
audit('new weapons preserve cooldown/heat, arc, pierce and explode exactly once',()=>{
 combatRoom();t.selectWeapon(8);t.fire();assert.equal(t.bullets[0].gravity,.18);assert.equal(t.bullets[0].vy,-3);
 const cd=t.p.fireCd,heat=t.p.heat;t.selectWeapon(6);assert.equal(t.p.fireCd,cd);assert.equal(t.p.heat,heat,'switching cannot bypass heat');
 combatRoom();t.selectWeapon(8);const near=enemy('walker'),far=enemy('walker');far.x=200;t.L.zs=[near,far];t.fire();t.update();t.update();
 assert.equal(near.hp,16,'direct grenade target receives splash once, not direct plus splash');assert.equal(far.hp,16,'nearby target receives splash');assert.equal(t.bullets.length,0);
 combatRoom();const target=enemy('walker');target.x=240;t.L.zs=[target];t.selectWeapon(8);t.fire();const fuse=t.bullets[0];Object.assign(fuse,{x:200,y:345,originX:200,originY:345,life:1});t.update();assert.equal(target.hp,16,'fuse expiry detonates');t.detonate(fuse);assert.equal(target.hp,16,'cannot detonate twice');
 combatRoom();const blocked=enemy('walker');blocked.x=220;t.L.zs=[blocked];t.L.grid[10][6]='H';t.L.grid[11][6]='H';
 t.detonate({x:180,y:350,dmg:4,blast:78,life:1});assert.equal(blocked.hp,20,'blast cannot cross terrain');
 combatRoom();const plated=enemy('plated');t.L.zs=[plated];t.fire();t.update();assert.equal(plated.hp,19.5,'plating halves a standard round');
 combatRoom();const armored=enemy('plated');t.L.zs=[armored];t.selectWeapon(7);t.fire();t.update();assert.ok(armored.hp<=18.2,'crossbow bypasses plating');
});
audit('new zombies telegraph jumps, heal allies with limits, and join later waves',()=>{
 combatRoom();const hopper=t.makeZombie(300,'leaper','nola',()=>.5);hopper.active=true;hopper.onGround=true;hopper.attack=30;t.L.zs=[hopper];
 for(let n=0;n<29;n++){t.update();assert.ok(hopper.vy>=0,'leaper warns before takeoff');}t.update();assert.ok(hopper.vy<0,'leaper launches after windup');
 combatRoom();const frozen=t.makeZombie(300,'leaper','nola',()=>.5);Object.assign(frozen,{active:true,onGround:true,attack:15});t.L.zs=[frozen];t.effects.freeze=60;t.update();assert.equal(frozen.attack,15);
 combatRoom();const medic=t.makeZombie(350,'medic','nola',()=>.5),ally=enemy('walker');Object.assign(medic,{active:true,onGround:true,attack:1,hp:2});Object.assign(ally,{x:280,hp:10});t.L.zs=[medic,ally];t.update();assert.equal(ally.hp,11);assert.equal(medic.hp,2,'medic never heals itself');assert.equal(medic.attack,180);
 medic.attack=1;ally.hp=ally.maxHp;t.update();assert.equal(ally.hp,ally.maxHp,'healing is capped');
 combatRoom();const m=t.makeZombie(350,'medic','nola',()=>.5),a=enemy('walker');Object.assign(m,{active:true,attack:1});Object.assign(a,{x:280,hp:10});t.L.zs=[m,a];for(const y of [10,11])t.L.grid[y][10]='H';t.update();assert.equal(a.hp,10,'medic cannot heal through terrain');
 const roster=new Set();t.startSurvival();for(let n=0;n<10;n++){t.spawnWave();for(const z of t.L.zs)roster.add(z.type);}for(const type of ['leaper','plated','medic'])assert.ok(roster.has(type));
 t.newGame(0);assert.equal(Object.keys(t.effects).length,0,'new effects do not leak to a new campaign');
});
audit('new weapon shortcuts cycle in both directions and preserve daily lock',()=>{
 combatRoom();const key=k=>listeners.keydown({key:k,repeat:false,preventDefault(){}});
 key('9');assert.equal(t.weaponIndex,8);key('q');assert.equal(t.weaponIndex,0);key('e');assert.equal(t.weaponIndex,8);key('7');assert.equal(t.weaponIndex,6);
 t.startDaily('2026-11-16');const locked=t.weaponIndex;key('q');key('e');key('9');assert.equal(t.weaponIndex,locked);
});
audit('grenade wall impacts and boss hits detonate once; blasts draw in fallback',()=>{
 combatRoom();t.L.grid[10][5]='H';t.L.grid[11][5]='H';const target=enemy('walker');target.x=200;t.L.zs=[target];t.selectWeapon(8);t.fire();t.update();t.update();t.update();assert.equal(t.bullets.length,0);assert.equal(target.hp,20,'wall absorbs the grenade and blocks splash');assert.ok(t.parts.some(p=>p.kind==='blast'));t.drawLevel();
 combatRoom();t.p.x=600;t.spawnBoss();const b=t.L.boss;Object.assign(b,{x:659,y:290,signatureCd:999,mode:'walk',timer:999,speed:0});const hp=b.hp;t.selectWeapon(8);t.fire();t.update();t.update();assert.equal(b.hp,hp-4,'boss takes only one blast');
});
audit('air reversals respond sooner without changing top speed',()=>{
 combatRoom();t.p.onGround=false;t.p.y=250;t.p.vx=2;t.touch.L=true;t.update();assert.ok(t.p.vx<=1.62,'stronger airborne direction reversal');t.touch.L=false;
});
audit('all longer courses have reachable added obstacles and protected exits',()=>{
 for(let i=0;i<100;i++){
  const l=t.buildLevel(i);
  if(l.info.isBoss){assert.equal(l.W,55);assert.equal(l.exitX,48);assert.equal(l.grid[11][44],'H');continue;}
  const d=i/99;assert.ok(l.W>=190+Math.floor(d*112));assert.ok(l.W<=209+Math.floor(d*112));
  const a=l.W-52;
  assert.equal(l.grid[10][a+3],'H');assert.equal(l.grid[10][a+12],'p');assert.equal(l.grid[10][a+23],'B');
  assert.ok(l.elements.every(e=>e.x+e.w<=(l.W-52)*32),'no timed hazards in the added finish approach');
  for(let x=l.flagX-6;x<l.W;x++){assert.equal(l.grid[12][x],'#');for(let y=0;y<11;y++)assert.equal(l.grid[y][x],' ');}
  for(const [x,width] of [[a+2,4],[a+12,2],[a+23,2]]){
   t.newGame(0);t.L=l;l.flagX=-1;l.zs=[];l.bolts=[];t.state='play';
   Object.assign(t.p,{x:x*32-65,y:324,vx:3.6,vy:0,onGround:true,coyote:8,inv:9999});
   t.touch.R=true;t.touch.J=true;t.jump();let crossed=false;
   for(let f=0;f<90;f++){if(f===12)t.touch.J=false;t.update();if(t.p.x>(x+width)*32 && t.p.onGround){crossed=true;break;}}
   t.releaseControls();assert.equal(crossed,true,'unpowered jump clears authored obstacle '+x+' in stage '+(i+1));
  }
 }
});
audit('every campaign stage celebrates once at its safe-house doorway, including bosses',()=>{
 for(let i=0;i<100;i++){
  t.newGame(i);t.state='play';t.L.zs=[];t.L.elements=[];t.L.pickups=[];t.L.cargo.carried=true;t.p.inv=9999;
  if(t.L.info.isBoss){
   t.L.crate={x:t.p.x,y:t.p.y,w:32,h:32,vy:0,onGround:true};
   t.update();assert.equal(t.L.grid[11][44],' ','boss exit wall opens only after reward');
  }else{t.p.x=t.L.flagX*32-28;t.p.y=324;t.p.onGround=true;t.update();}
  assert.equal(t.state,'clear');assert.equal(t.L.celebration,undefined,'flag/reward itself does not start the party');
  for(let n=0;n<800 && !t.L.celebration;n++)t.update();
  assert.ok(t.L.celebration,'stage '+(i+1)+' reaches the party');assert.equal(t.clearPhase,4);
  assert.equal(t.p.x+t.p.w/2,t.L.exitX*32+100,'party starts at the visible doorway');
  assert.equal(t.p.y+t.p.h,384);assert.equal(t.p.vx,0);assert.ok(t.parts.some(p=>p.kind==='confetti'));
  const ticks=t.L.runTicks,wallet=t.wallet,count=t.parts.length;
  t.startCelebration();assert.equal(t.parts.length,count,'no duplicate celebration emission');
  for(let n=0;n<179;n++)t.update();assert.equal(t.clearPhase,4,'full three-second celebration');
  assert.equal(t.L.runTicks,ticks,'celebration does not add to speed time');assert.equal(t.wallet,wallet,'party cannot duplicate rewards');
  assert.ok(t.parts.length<=400,'bounded particle count');const particles=JSON.stringify(t.parts);t.drawLevel();t.drawHUD();t.drawScreens();assert.equal(JSON.stringify(t.parts),particles,'drawing confetti does not advance physics or mutate particles');
  t.update();assert.equal(t.clearPhase,2,'time tally starts only after the party');
 }
});
audit('celebration respects reduced motion and campaign overlay pause, then final stage wins',()=>{
 cleanRun(99);sandbox.matchMedia=()=>({matches:true});t.startCelebration();assert.ok(!t.parts.some(p=>p.kind==='confetti'));
 t.state='clear';const partyTicks=t.L.celebration.ticks;t.openCampaign();for(let i=0;i<30;i++)t.update();assert.equal(t.L.celebration.ticks,partyTicks);t.closeCampaign();delete sandbox.matchMedia;
 for(let n=0;n<600 && t.state==='clear';n++)t.update();assert.equal(t.state,'win','last level reaches win rather than generating stage 101');
 t.newGame(0);assert.equal(t.L.celebration,undefined,'retries/new levels reset party');
});

audit('existing mystery boxes contain deterministic single-use powers from all eighteen rewards',()=>{
 const rewards=new Set();
 for(let i=0;i<100;i++){
  const l=t.buildLevel(i),again=t.buildLevel(i),entries=Object.entries(l.boxPowers);
  assert.deepEqual(JSON.parse(JSON.stringify(l.boxPowers)),JSON.parse(JSON.stringify(again.boxPowers)));
  const mysteryCount=l.grid.flat().filter(tile=>tile==='?').length;
  assert.equal(entries.length,Math.ceil(mysteryCount/2),'half the existing mystery boxes contain powers');
  assert.ok(!l.grid.some(row=>row.includes('S')),'no separate power-box tile');
  for(const [key,id] of entries){const [x,y]=key.split(',').map(Number);assert.equal(l.grid[y][x],'?');rewards.add(id);}

 }
 assert.equal(rewards.size,18);
 cleanRun();t.L.grid=Array.from({length:14},(_,y)=>Array(50).fill(y>=12?'#':' '));t.L.W=50;t.L.flagX=-1;
 t.L.grid[8][10]='?';t.L.boxPowers={'10,8':'shield'};
 Object.assign(t.p,{x:323,y:324,vx:0,vy:0,onGround:true,coyote:8});t.touch.J=true;t.jump();
 for(let n=0;n<20 && t.L.grid[8][10]==='?';n++)t.update();t.releaseControls();
 assert.equal(t.L.grid[8][10],'U','jumping into an existing mystery box activates its power');assert.ok(t.effects.shield>0);

 for(const item of t.SHOP_POWERS){
  cleanRun();t.L.grid[8][10]='?';t.L.boxPowers={'10,8':item.id};t.p.health=1;
  const wallet=t.wallet,time=t.time;t.hitBlock(10,8);
  assert.equal(t.L.grid[8][10],'U');assert.equal(t.wallet,wallet,'free rewards never spend coins');
  if(item.id==='heal')assert.equal(t.p.health,3);else if(item.id==='time')assert.equal(t.time,time+60);else assert.equal(t.effects[item.id],1800);
  assert.ok(t.parts.some(p=>p.kind==='powerpop'));t.drawLevel();
  const effects=JSON.stringify(t.effects),health=t.p.health,after=t.time,count=t.parts.length;
  t.hitBlock(10,8);assert.equal(JSON.stringify(t.effects),effects);assert.equal(t.p.health,health);assert.equal(t.time,after);assert.equal(t.parts.length,count,'used box gives no second reward');
 }
 cleanRun();t.L.boxPowers={};t.L.grid[8][10]='?';const coins=t.wallet;t.hitBlock(10,8);assert.equal(t.wallet,coins+1);
 t.L.grid[8][11]='M';t.p.health=1;t.hitBlock(11,8);assert.equal(t.p.health,2,'medkit still heals one heart');
 t.startDaily('2026-11-19');assert.ok(!t.L.grid.some(row=>row.includes('S')));assert.equal(Object.keys(t.L.boxPowers).length,0);
 t.startSurvival();assert.ok(!t.L.grid.some(row=>row.includes('S')));
});

audit('dash is edge-triggered, collision-safe, pause-safe and limited in air',()=>{
 const dash=()=>{listeners.keydown({key:'v',repeat:false,preventDefault(){}});t.update();listeners.keyup({key:'v'});};
 combatRoom();t.p.face=1;const x=t.p.x;dash();assert.equal(t.p.x-x,8);assert.equal(t.p.dashCd,75);assert.equal(t.p.inv,0,'dash grants no invulnerability');
 const cd=t.p.dashCd;t.togglePause();dash();assert.equal(t.p.dashCd,cd);assert.equal(t.p.dashTicks,0);t.togglePause();
 combatRoom();t.L.grid[10][4]='H';t.L.grid[11][4]='H';t.p.x=100;dash();assert.ok(t.p.x+t.p.w<=128);assert.equal(t.p.dashTicks,0,'wall ends dash');
 combatRoom();t.p.onGround=false;t.p.y=150;t.p.coyote=0;dash();assert.equal(t.p.airDashed,true);
 t.p.dashTicks=0;t.p.dashCd=0;dash();assert.equal(t.p.dashTicks,0,'no repeat airborne dash before landing');
 t.p.onGround=true;t.p.y=324;dash();assert.ok(t.p.dashTicks>0,'landing restores airborne dash');
 combatRoom();nodes.bDash.events.pointerdown({pointerId:99,preventDefault(){}});t.update();assert.equal(t.p.dashCd,75);t.releaseControls();assert.equal(t.touch.D,false);assert.equal(t.p.dashTicks,0);
 sandbox.matchMedia=()=>({matches:true});combatRoom();dash();assert.ok(!t.parts.some(p=>p.kind==='dash'));delete sandbox.matchMedia;
});
audit('charger warns, locks direction, rushes, recovers and respects freeze and stagger',()=>{
 combatRoom();const z=t.makeZombie(340,'charger','nola',()=>.5);Object.assign(z,{active:true,onGround:true});t.L.zs=[z];
 t.update();assert.equal(z.chargeState,'warn');assert.equal(z.chargeTicks,45);assert.equal(Math.abs(z.vx),0);
 for(let i=0;i<44;i++)t.update();assert.equal(z.chargeState,'warn');
 t.effects.freeze=10;t.update();assert.equal(z.chargeTicks,1);t.effects.freeze=0;t.update();assert.equal(z.chargeState,'rush');assert.equal(z.vx,-5);
 z.stagger=2;t.update();assert.equal(Math.abs(z.vx),0);assert.equal(z.chargeTicks,30);
 z.stagger=0;z.chargeTicks=1;t.update();assert.equal(z.chargeState,'recover');assert.equal(Math.abs(z.vx),0);
 z.chargeTicks=1;t.update();assert.equal(z.chargeState,'stalk');
 z.chargeState='rush';z.chargeTicks=20;z.chargeDir=1;z.x=299;t.L.grid[10][10]='H';t.L.grid[11][10]='H';t.update();assert.equal(z.chargeState,'recover','wall ends rush');
 const roster=new Set();t.startSurvival();for(let i=0;i<8;i++){t.spawnWave();for(const z of t.L.zs)roster.add(z.type);}assert.ok(roster.has('charger'));
});
audit('combat feedback reports damage and streaks without changing weapon damage',()=>{
 combatRoom();const z=enemy('walker');z.x=155;t.L.zs=[z];t.fire();t.update();assert.equal(z.hp,19);assert.equal(z.stagger,6);assert.ok(t.popups.some(q=>q.damage && q.txt==='1'));assert.ok(t.parts.some(q=>q.kind==='impact'));
 const x=z.x;t.update();assert.equal(z.x,x,'hit stagger stops movement');
 combatRoom();const score=t.score;for(let i=0;i<3;i++)t.killZombie({dead:false,active:false,pts:100,x:200,y:324,w:24,h:48},1);
 assert.equal(t.p.streak,3);assert.equal(t.score-score,600,'three kills award 300 score plus 300 streak bonus');
 t.p.inv=0;t.hurtPlayer(200);assert.equal(t.p.streak,0);assert.equal(t.p.streakTicks,0);
 t.registerHit(200,200,2.5);t.drawAdventure();assert.ok(hudText.includes('2.5'),'shared overlay renders damage text');
});
audit('optional ring run, secrets and beams are single-use, pausable and mode-isolated',()=>{
 combatRoom();const startWallet=t.wallet;t.L.bonus={rings:[100,180,260].map(x=>({x,y:340,got:false})),ticks:0,started:false,done:false,failed:false};
 t.p.x=88;t.p.y=310;t.updateAdventure();assert.equal(t.L.bonus.ticks,600);
 t.openShop();for(let i=0;i<30;i++)t.update();assert.equal(t.L.bonus.ticks,600);t.closeShop();
 for(const x of [180,260]){t.p.x=x-12;t.updateAdventure();}assert.equal(t.L.bonus.done,true);assert.equal(t.wallet,startWallet+15);t.updateAdventure();assert.equal(t.wallet,startWallet+15);
 t.L.bonus.done=false;t.L.bonus.ticks=1;t.L.bonus.rings[2].got=false;t.updateAdventure();assert.equal(t.L.bonus.failed,true,'time expiry cannot grant a last-tick reward');
 t.L.grid[8][10]='B';t.L.secrets={'10,8':true};const wallet=t.wallet;t.hitBlock(10,8);t.hitBlock(10,8);assert.equal(t.wallet,wallet+10);assert.equal(t.L.grid[8][10],' ');
 combatRoom();t.L.sweepers=[{x:96,w:32,phase:0}];t.frame=179;t.update();assert.equal(t.p.health,2,'active beam damages grounded player');
 combatRoom();t.L.sweepers=[{x:96,w:32,phase:0}];t.frame=179;t.p.y=260;t.p.onGround=false;t.update();assert.equal(t.p.health,3,'jump clears beam');
 t.startDaily('2026-11-19');assert.equal(t.L.bonus,null);assert.equal(t.L.sweepers.length,0);assert.equal(Object.keys(t.L.secrets).length,0);
 t.startSurvival();assert.equal(t.L.bonus,null);assert.equal(t.L.sweepers.length,0);assert.equal(Object.keys(t.L.secrets).length,0);
});
audit('optional content stays on intact street, out of exits, and retains original box layout',()=>{
 let rings=0,beams=0,secrets=0,chargers=0;
 for(let i=0;i<100;i++){
  const l=t.buildLevel(i);
  for(const e of l.sweepers){beams++;const x=e.x/32;assert.equal(l.grid[12][x],'#');assert.ok(x<l.W-60);assert.ok(!l.elements.some(other=>e.x<other.x+other.w && e.x+e.w>other.x));}
  if(l.bonus){rings++;assert.equal(l.bonus.rings.length,3);for(const r of l.bonus.rings){const x=Math.floor(r.x/32);assert.equal(l.grid[12][x],'#');assert.ok(x<l.W-60);}}
  for(const key of Object.keys(l.secrets)){secrets++;const [x,y]=key.split(',').map(Number);assert.equal(l.grid[y][x],'B');}
  chargers+=l.zs.filter(z=>z.type==='charger').length;
  t.newGame(i);t.state='play';t.drawAdventure();
 }
 assert.ok(rings>40);assert.ok(beams>40);assert.ok(secrets>20);assert.ok(chargers>0);
});
if(auditFailures.length)throw Error('AUDIT FAILURES\n'+auditFailures.join('\n'));
module.exports = { test: t };
