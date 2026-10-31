import * as THREE from 'three';

// The simulation remains on a side-scrolling plane. Every visible object here is
// lit, depth-tested 3D geometry, not a transformed screenshot of the 2D canvas.
const canvas = document.getElementById('world3d');
const overlay = document.getElementById('c');
const button = document.getElementById('bView');
const status = document.getElementById('renderStatus');
const view = { enabled: false, render() {} };
window.Cargo3D = view;
try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(800, 448, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-400, 400, 224, -224, 1, 2500);
  scene.add(new THREE.HemisphereLight(0xc9ebff, 0x332238, 2.4));
  const sun = new THREE.DirectionalLight(0xffe2bc, 2.6);
  sun.position.set(-300, 600, 500); scene.add(sun);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const batches = new Map();
  const palette = {
    road:'#404759', edge:'#69778b', rock:'#282f43', brick:'#ad6458', gold:'#ffd25d',
    green:'#78d6a0', teal:'#31bcb7', dark:'#192635', white:'#eff7f7', purple:'#9259c7',
    skin:'#d4a774', boots:'#172536', red:'#ff675f', blue:'#6ec4e8', glass:'#a6e9ee',
    zombie:'#8cab64', trunk:'#846354', leaves:'#438a74', silver:'#bac5d1', orange:'#f6a35b'
  };
  function batch(color) {
    if (batches.has(color)) return batches.get(color);
    const material = new THREE.MeshStandardMaterial({ color, roughness:.75, metalness:.08 });
    const mesh = new THREE.InstancedMesh(geometry, material, 2048);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
    scene.add(mesh); const result = {mesh,count:0}; batches.set(color,result); return result;
  }
  function box(x,y,z,w,h,d,color,angle=0) {
    const b=batch(palette[color] || color); if(b.count>=2048)return;
    position.set(x,y,z); scale.set(w,h,d);
    rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
    matrix.compose(position,rotation,scale); b.mesh.setMatrixAt(b.count++,matrix);
  }
  function person(body, player, boss=false) {
    const x=body.x+body.w/2, feet=448-body.y-body.h;
    const h=body.h, walk=Math.sin(body.anim||0)*7;
    const color=body.flash>0?'white':player?'purple':boss?'red':'zombie';
    box(x,feet+h*.53,0,body.w*.85,h*.40,22,color);
    box(x,feet+h*.84,0,body.w*.70,h*.26,21,player?'skin':'zombie');
    const face=player?body.face:body.dir||body.face||-1;
    box(x+face*body.w*.2,feet+h*.88,12,8,4,3,player?'dark':'red');
    box(x,feet+h*.99,0,body.w*.90,7,24,player?'gold':'dark');
    box(x-7,feet+h*.18+walk*.25,0,8,h*.30,13,'boots');
    box(x+7,feet+h*.18-walk*.25,0,8,h*.30,13,'boots');
    box(x+face*15,feet+h*.55,6,22,8,10,player?'skin':'zombie');
    if(player){
      const w=window.__game.weapon;
      const length=w.name==='Railgun'?46:w.name==='Shotgun'?36:30;
      box(x+face*26,feet+h*.54,15,length,8,10,'dark');
      box(x+face*(26+length/2),feet+h*.54,15,5,7,11,w.color);
      if(body.flash>0)box(x+face*(32+length/2),feet+h*.54,15,14,16,16,'gold');
      if(window.__game.effects.shield>0){
        box(x,feet-2,0,body.w+18,3,40,'teal');
        box(x-face*20,feet+h*.5,0,3,h+10,35,'teal');
      }
    }
  }
  let previousWidth=0, previousHeight=0;
  function fit(){
    canvas.style.width=overlay.style.width;canvas.style.height=overlay.style.height;
    const width=Math.round(parseFloat(overlay.style.width))||800;
    const height=Math.round(parseFloat(overlay.style.height))||448;
    if(width!==previousWidth || height!==previousHeight){renderer.setSize(width,height,false);previousWidth=width;previousHeight=height;}
  }
  view.render = game => {
    if(!game)return;
    fit();
    for(const b of batches.values())b.count=0;
    const { L, cam, frame, player, effects }=game;
    const course=L.info.course;
    scene.background=new THREE.Color(course.sky);
    scene.fog=new THREE.Fog(course.sky,1100,1900);
    camera.position.set(cam+400,444,1000);camera.lookAt(cam+400,224,0);
    const start=Math.max(0,Math.floor(cam/32)-3), end=Math.min(L.W,Math.ceil((cam+800)/32)+4);
    // Deep set dressing: buildings are separate solids behind the gameplay plane.
    for(let k=Math.floor(cam/150)-2;k<Math.ceil((cam+800)/150)+3;k++){
      const x=k*150+75, variation=((k*17+L.i*3)%5+5)%5;
      const height=120+variation*30;
      const colors=['#576782','#786b86','#456b79','#826f71','#586e63'];
      box(x,64+height/2,-200,132,height,95,colors[(variation+L.i)%5]);
      box(x,64+height,-200,143,9,108,'edge');
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)
        box(x-42+col*42,95+row*45,-150,18,26,3,(row+col+variation)%3===0?'gold':'glass');
      if(L.info.loc.id==='lej'||L.info.loc.id==='pi')box(x,90,-143,100,4,4,'green');
      switch(course.element){
        case 'supply': box(x,110,-130,132,12,50,'purple');box(x,113,-100,130,4,5,'gold');break;
        case 'spring': box(x,72,-90,115,8,25,'silver');box(x-53,102,-90,6,64,6,'teal');box(x+53,102,-90,6,64,6,'teal');break;
        case 'steam': box(x+32,64+height+30,-200,18,60,18,'brick');box(x+32,64+height+70,-200,30,20,25,'silver');break;
        case 'wind': box(x,64+height+16,-200,112,22,65,'teal');break;
        case 'ice': box(x,64+height+4,-200,143,8,108,'white');break;
        case 'belt': box(x,95,-100,108,54,60,'orange');for(let r=0;r<6;r++)box(x-43+r*17,95,-68,3,46,3,'dark');break;
        case 'gravity': box(x,64+height+28,-200,50,50,50,'purple',frame*.01);break;
        case 'thorn': box(x-59,120,-145,7,110,8,'leaves');box(x+45,160,-145,8,170,8,'leaves');break;
        case 'water': box(x,53,-90,146,8,90,'blue');box(x,90,-95,70,12,40,'trunk');break;
        case 'storm': box(x,64+height+38,-200,4,76,4,'silver');box(x,64+height+75,-200,12,8,12,'gold');break;
      }
    }
    // Back retaining wall and luminous lane markers expose road depth.
    for(let x=start;x<end;x++)for(let y=0;y<14;y++){
      const tile=L.grid[y][x];if(tile===' ')continue;
      const wx=x*32+16, wy=448-y*32-16;
      if(tile==='#'){
        box(wx,wy,-9,32,32,100,y===12?'road':'rock');
        if(y===12){box(wx,wy+16,38,32,3,5,'edge');if(x%4===0)box(wx,wy+17,-20,15,1,3,'gold');}
      }else{
        const color=tile==='='?'silver':tile==='?'?'gold':tile==='M'?'white':tile==='B'?'brick':tile==='H'?'rock':tile==='U'?'trunk':'teal';
        box(wx,wy,0,31,32,38,color);
        if(tile==='?'||tile==='M'){box(wx,wy,21,5,17,3,tile==='M'?'red':'purple');box(wx,wy+3,21,14,5,3,tile==='M'?'red':'purple');}
        if(tile==='=')box(wx,wy+17,0,32,3,40,course.accent);
      }
    }
    for(const prop of L.props){
      if(prop.x<cam-100||prop.x>cam+900)continue;
      if(prop.type==='tree'){
        box(prop.x,112,-85,8,96,8,'trunk');box(prop.x,173,-85,65,65,40,'leaves');
      }else if(prop.type==='car'){
        box(prop.x,85,-85,80,26,38,course.accent);box(prop.x,106,-85,45,22,34,'glass');
        box(prop.x-27,70,-62,13,15,8,'dark');box(prop.x+27,70,-62,13,15,8,'dark');
      }else if(prop.type==='lamp'){
        box(prop.x,131,-65,5,134,5,'dark');box(prop.x+9,201,-65,24,7,16,'gold');
      }
    }
    for(const e of L.elements||[]){
      if(e.x<cam-100||e.x>cam+900)continue;
      const phase=(frame+e.phase)%240;
      const hot=['steam','storm'].includes(e.kind)&&phase>=180&&phase<215;
      const warning=phase>=140&&phase<180;
      box(e.x+e.w/2,65,1,e.w,3,72,hot?'red':warning?'gold':course.accent);
      if(e.kind==='spring')for(let j=0;j<3;j++)box(e.x+12+j*32,72,0,18,9,22,'green');
      if(e.kind==='thorn')for(let j=0;j<6;j++)box(e.x+8+j*16,76,0,5,22,9,'purple');
      if(e.kind==='water')box(e.x+e.w/2,70,0,e.w,10,70,'blue');
      if(e.kind==='belt')for(let j=0;j<5;j++)box(e.x+((frame+j*20)%e.w),68,25,10,2,12,'dark');
      if(hot)for(let j=0;j<4;j++)box(e.x+12+j*24,100,0,8,72,12,e.kind==='storm'?'gold':'white');
      if(e.kind==='gravity')box(e.x+e.w/2,140+Math.sin(frame*.03)*16,-65,24,24,24,'purple',frame*.02);
    }
    for(const coin of L.bolts)if(!coin.got&&coin.x>cam-30&&coin.x<cam+850)
      box(coin.x,448-coin.y+Math.sin(frame*.08)*2,5,14,18,5,'gold',frame*.06);
    for(const cache of L.pickups||[])if(!cache.got){
      box(cache.x,448-cache.y,0,25,25,25,'teal',frame*.02);box(cache.x,448-cache.y,15,4,16,3,'white');box(cache.x,448-cache.y,15,16,4,3,'white');
    }
    if(L.flagX>0){
      box(L.flagX*32+15,224,0,4,288,4,'silver');
      box(L.flagX*32-7,448-game.flagY-14,0,40,28,4,'purple');
      box(L.flagX*32+15,385,0,12,12,12,'gold');
      if(L.exitX*32<cam+1000){box(L.exitX*32+80,124,-30,160,120,80,'rock');box(L.exitX*32+80,164,13,80,18,4,'green');}
    }
    for(const z of L.zs)if(z.alive&&z.active&&z.x>cam-80&&z.x<cam+880)person(z,false);
    if(L.boss)person(L.boss,false,true);
    if(L.crate)box(L.crate.x+16,448-L.crate.y-16,0,32,32,32,'gold');
    for(const b of game.bullets)box(b.x,448-b.y,10,12,5,5,b.color||'gold');
    for(const shot of game.spits)box(shot.x,448-shot.y,4,12,12,12,'green');
    for(const p of game.parts.slice(-100))box(p.x,448-p.y,8,4,4,4,p.kind==='gore'?'red':'gold');
    if(!(game.state==='play'&&player.inv>0&&frame%6<3))person(player,true);
    for(const b of batches.values()){
      b.mesh.count=b.count;b.mesh.instanceMatrix.needsUpdate=true;
    }
    renderer.render(scene,camera);
    canvas.dataset.rendered='true';
    canvas.dataset.drawCalls=String(renderer.info.render.calls);
  };
  view.enabled=true;
  function setEnabled(enabled){
    view.enabled=enabled;canvas.hidden=!enabled;button.textContent=enabled?'3D · ON':'2D · ON';
    status.textContent=enabled?'3D WORLD · Q / 1–6: WEAPONS':'';
  }
  button.addEventListener('click',()=>setEnabled(!view.enabled));
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();setEnabled(false);status.textContent='3D context lost. Playing in 2D; reload to retry.';button.disabled=true;
  });
  setEnabled(true);fit();
} catch(error) {
  canvas.hidden=true;button.textContent='2D · COMPATIBILITY';button.disabled=true;
  status.textContent='3D unavailable on this browser. All gameplay works in 2D.';
  console.warn('Cargo Quest 3D renderer unavailable:',error.message);
}
