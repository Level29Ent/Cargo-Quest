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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); // fit() chooses native-density output within the pixel budget.
  renderer.setSize(800, 448, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-400, 400, 224, -224, 1, 2500);
  scene.add(new THREE.HemisphereLight(0xc9ebff, 0x27263b, 1.8));
  const sun = new THREE.DirectionalLight(0xffe2bc, 2.4);
  sun.position.set(-300, 600, 500); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x91dfff, 1.6);
  rim.position.set(300, 180, -200);scene.add(rim);
  const geometries = {
    box: new THREE.BoxGeometry(1,1,1),
    sphere: new THREE.SphereGeometry(.5,12,8),
    cylinder: new THREE.CylinderGeometry(.5,.5,1,12),
    cone: new THREE.ConeGeometry(.5,1,12),
    cake: new THREE.TorusGeometry(8.5,3.8,8,36),
    icing: new THREE.TorusGeometry(8.5,2.9,8,36),
    ...Object.fromEntries(Array.from({length:6},(_,i)=>[
      'sugar'+i,new THREE.TorusGeometry(8.5,2.3,6,8,Math.PI/3-.13).rotateZ(i*Math.PI/3).scale(1.25,1,1)
    ]))
  };
  // Generated once, locally: no extra image requests or full-screen post-processing.
  // Neither the orthographic camera nor CSS creates a resampling pass: the
  // scene renders directly into the native-density framebuffer. Texture reads
  // and any browser enlargement must also avoid interpolating pixel colors.
  function pixelTexture(map){
    map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestFilter;
    map.generateMipmaps=false;map.anisotropy=1;
    return map;
  }
  function texture(kind){
    const surface=document.createElement('canvas');surface.width=128;surface.height=128;
    const ctx=surface.getContext('2d');ctx.fillStyle=kind==='road'?'#b6b6b6':'#ded3c8';ctx.fillRect(0,0,128,128);
    for(let i=0;i<650;i++){
      const x=(i*73+19)%128,y=(i*47+Math.floor(i/128)*13)%128;
      ctx.fillStyle=i%2?'rgba(0,0,0,.13)':'rgba(255,255,255,.22)';ctx.fillRect(x,y,1+(i%2),1);
    }
    if(kind==='brick'){
      ctx.strokeStyle='#83766c';ctx.lineWidth=2;
      for(let y=0;y<128;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y);ctx.stroke();
        for(let x=(y/32)%2?32:0;x<128;x+=64){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+32);ctx.stroke();}}
    }
    const map=new THREE.CanvasTexture(surface);map.colorSpace=THREE.SRGBColorSpace;
    return pixelTexture(map);
  }
  const roadMap=texture('road'), brickMap=texture('brick');
  const skySurface=document.createElement('canvas');skySurface.width=16;skySurface.height=256;
  const skyCtx=skySurface.getContext('2d');
  const skyMap=pixelTexture(new THREE.CanvasTexture(skySurface));skyMap.colorSpace=THREE.SRGBColorSpace;
  const sky=new THREE.Mesh(new THREE.PlaneGeometry(2800,1400),new THREE.MeshBasicMaterial({map:skyMap,depthWrite:false}));
  sky.position.set(400,400,-850);sky.renderOrder=-1;scene.add(sky);
  let skyColor='';
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
  let sceneryPass=false;
  function batch(color,shape='box',finish='matte') {
    const key=shape+':'+finish+':'+color;
    if (batches.has(key)) return batches.get(key);
    const surfaceColor=finish==='scenery'?new THREE.Color(color).lerp(new THREE.Color('#243247'),.66):color;
    const material = finish==='cue'?new THREE.MeshBasicMaterial({color,toneMapped:false}):new THREE.MeshStandardMaterial({ color:surfaceColor,
      roughness:finish==='metal'?.3:.82, metalness:finish==='metal'?.65:.03,
      emissive:finish==='glow'?color:0x000000,emissiveIntensity:finish==='glow'?1.5:0,
      map:color===palette.road?roadMap:color===palette.brick?brickMap:null
    });
    const mesh = new THREE.InstancedMesh(geometries[shape], material, 2048);
    mesh.userData.readabilityRole=finish;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
    scene.add(mesh); const result = {mesh,count:0}; batches.set(key,result); return result;
  }
  const zAxis=new THREE.Vector3(0,0,1), xAxis=new THREE.Vector3(1,0,0);
  function shape(kind,x,y,z,w,h,d,color,angle=0,finish='matte',axis=THREE.Object3D.DEFAULT_UP){
    const b=batch(palette[color] || color,kind,sceneryPass?'scenery':finish); if(b.count>=2048)return;
    position.set(x,y,z); scale.set(w,h,d);rotation.setFromAxisAngle(axis,angle);
    matrix.compose(position,rotation,scale);b.mesh.setMatrixAt(b.count++,matrix);
  }
  function box(x,y,z,w,h,d,color,angle=0,finish='matte'){
    shape('box',x,y,z,w,h,d,color,angle,finish);
  }
  function orb(x,y,z,w,h,d,color,finish='matte'){
    shape('sphere',x,y,z,w,h,d,color,0,finish);
  }
  // Face-on oval pastry rings keep their center hole readable at pickup size.
  // All cakes share instanced geometry; sugar sectors repeat purple/green/gold.
  function kingCake(x,y){
    shape('cake',x,y,5,1.25,1,1,'#c48238');
    shape('icing',x,y+.5,7,1.25,1,1,'#fff3df');
    const sugars=['#8c35bc','#1baf55','#f5c52e'];
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;
      shape('sugar'+i,x,y+.5,8.8,1,1,.7,sugars[i%3]);
      // Small icing drips and sugar crystals break up the perfect torus outline.
      const a=angle+.45,px=x+Math.cos(a)*10.6,py=y+Math.sin(a)*8.5;
      orb(px,py-1,8,3,5,2,'#fff3df');
      for(let j=0;j<3;j++){
        const t=angle+.18+j*.23,r=8+(j%2)*1.5;
        box(x+Math.cos(t)*r*1.25,y+.5+Math.sin(t)*r,10.6,.8,1.2,.7,j===1?'#fff3df':sugars[i%3],t);
      }
    }
  }
  function limb(x1,y1,x2,y2,z,width,color){
    const dx=x2-x1,dy=y2-y1;
    shape('cylinder',(x1+x2)/2,(y1+y2)/2,z,width,Math.hypot(dx,dy),width,color,-Math.atan2(dx,dy),'matte',zAxis);
    orb(x2,y2,z,width,width,width,color);
  }
  function person(body, isPlayer, boss=false) {
    if(body.dead && body.deathKind==='dissolve' && body.deathT>20)return;
    const x=body.x+body.w/2, feet=448-body.y-body.h;
    const h=body.dead && body.deathKind==='crumble'?Math.max(10,body.h*.6):body.h, width=body.w, face=isPlayer?body.face:body.dir||body.face||-1;
    const gait=Math.sin(body.anim||0)*(body.onGround===false?2:7);
    const hurt=!isPlayer && body.flash>0;
    const infectedSkin=body.type==='brute'||body.type==='crawler'?'#68816b':body.type==='runner'?'#a4b578':body.type==='leaper'?'teal':body.type==='charger'?'#68816b':'zombie';
    const skin=hurt?'white':isPlayer?'skin':infectedSkin;
    const color=hurt?'white':isPlayer?(body.role==='partner'?'teal':window.__game.cosmetic?.outfit||'purple'):boss?'red':body.type==='runner'?'brick':body.type==='brute'?'dark':body.type==='medic'?'teal':body.type==='thief'?'purple':'boots';
    // A flattened contact decal gives feet a grounding cue without mobile shadow maps.
    if(body.onGround)orb(x,feet+.5,-2,width*1.7,1.5,32,'#17212c');
    limb(x-6,feet+h*.38,x-7+gait,feet+8,0,8,isPlayer?'purple':'dark');
    limb(x+6,feet+h*.38,x+7-gait,feet+8,0,8,isPlayer?'green':'dark');
    orb(x-7+gait,feet+5,4,13,9,18,'boots');orb(x+7-gait,feet+5,4,13,9,18,'boots');
    orb(x,feet+h*.53,0,width*.95,h*.43,24,color);
    box(x,feet+h*.36,1,width,5,25,'dark');box(x,feet+h*.36,15,6,5,3,'gold',0,'metal');
    // Brows, inset eye sockets and cheek planes replace the flat toy-like face.
    orb(x,feet+h*.82,0,width*.72,h*.27,21,skin);
    orb(x+face*2,feet+h*.755,4,width*.56,h*.105,18,skin);
    for(const dx of [-width*.36,width*.36])orb(x+dx,feet+h*.82,1,4,7,6,skin);
    for(const dx of [-4,5])orb(x+dx,feet+h*.86,10,7,6,4,'dark');
    const eyeY=feet+h*.86;
    orb(x-4,eyeY,11,5,5,3,'white');orb(x+5,eyeY,11,5,5,3,'white');
    orb(x-4+face,eyeY,13,2.5,3,2,isPlayer?'dark':'red',isPlayer?'matte':'glow');
    orb(x+5+face,eyeY,13,2.5,3,2,isPlayer?'dark':'red',isPlayer?'matte':'glow');
    orb(x+face*3,feet+h*.8,13,4,5,5,skin);
    box(x,feet+h*.75,13,10,3.5,2,'dark');
    for(let j=0;j<4;j++)box(x-3+j*2,feet+h*.755-(j%2)*.4,15,1.3,1.8,1,'white');
    box(x-4,feet+h*.90,12,7,1.8,2,'dark',-.15);box(x+5,feet+h*.90,12,7,1.8,2,'dark',.15);
    // Clothing seams, kneepads and gloves stay within the original visual footprint.
    for(const dx of [-7,7]){
      box(x+dx,feet+h*.24,7,6,5,3,'boots');
      box(x+dx,feet+h*.37,14,6,6,3,color);
    }
    box(x,feet+h*.51,13,1.5,15,2,'gold');
    limb(x-9,feet+h*.62,x-12-gait*.5,feet+h*.41,3,7,color);
    limb(x+face*9,feet+h*.61,x+face*22,feet+h*.51,9,7,skin);
    if(isPlayer){
      // Three-point purple/green/gold jester cap, bells and ruffled collar.
      const sway=Math.sin((body.anim||0)*.7)*.10;
      orb(x,feet+h*.96,0,width,9,26,body.role==='partner'?'teal':window.__game.cosmetic?.outfit||'purple');
      shape('cone',x-10,feet+h+7,0,12,22,14,'purple',.6+sway,'matte',zAxis);
      shape('cone',x+10,feet+h+7,0,12,22,14,'green',-.6+sway,'matte',zAxis);
      shape('cone',x,feet+h+12,-3,10,25,12,'gold');
      for(const [dx,dy] of [[-15,16],[15,16],[0,25]])orb(x+dx,feet+h+dy,0,5,5,5,'gold','metal');
      for(let j=-1;j<=1;j++)shape('cone',x+j*8,feet+h*.68,10,10,10,10,j===0?'gold':'white',Math.PI);
      box(x,feet+h*.54,14,3,16,2,'gold');
      // Courier harness, split tunic, diamond applique and compact delivery pack.
      box(x-8,feet+h*.54,14,3,18,3,'boots',-.15);
      box(x+8,feet+h*.54,14,3,18,3,'boots',.15);
      box(x-5,feet+h*.58,16,5,5,2,'green',Math.PI/4);
      box(x+5,feet+h*.48,16,5,5,2,'gold',Math.PI/4);
      box(x-face*13,feet+h*.52,-9,11,22,16,'purple');
      box(x-face*13,feet+h*.52,0,12,4,2,'gold');
      orb(x+face*22,feet+h*.51,11,7,7,7,'boots');
      const w=body.role==='partner'?{name:'Carbine',color:'#7cfff0'}:window.__game.weapon;
      const length=w.name==='Railgun'?46:w.name==='Shotgun'?36:30;
      const kick=body.recoil||0;
      const gunX=x-face*kick;
      box(gunX+face*25,feet+h*.51,15,length,7,9,window.__game.cosmetic?.skin||'dark',0,'metal');
      limb(gunX+face*27,feet+h*.48,gunX+face*24,feet+h*.38,15,5,'dark');
      box(gunX+face*21,feet+h*.56,15,10,3,6,'silver',0,'metal');
      shape('cylinder',gunX+face*(25+length/2),feet+h*.51,15,6,8,6,'silver',Math.PI/2,'metal',zAxis);
      box(gunX+face*32,feet+h*.51,20,12,2,2,w.color,0,'glow');
      if(w.name==='Bayou Crossbow'){
        limb(gunX+face*34,feet+h*.51-15,gunX+face*42,feet+h*.51,18,3,w.color);
        limb(gunX+face*42,feet+h*.51,gunX+face*34,feet+h*.51+15,18,3,w.color);
      }
      if(w.name==='Grenade Launcher')shape('cylinder',gunX+face*25,feet+h*.51-4,16,16,22,16,w.color,Math.PI/2,'matte',zAxis);
      if(w.name==='Nail Repeater')box(gunX+face*30,feet+h*.51+6,18,25,3,3,w.color);
      if(w.name==='Flamer'||w.name==='Plasma')orb(x-8,feet+h*.49,-10,14,23,13,w.color,'metal');
      if(body.flash>0){
        shape('cone',gunX+face*(36+length/2),feet+h*.51,15,12,25,12,'gold',-face*Math.PI/2,'glow',zAxis);
        orb(gunX+face*(34+length/2),feet+h*.51,15,10,10,10,'white','glow');
      }
      if(window.__game.effects.shield>0 || window.__game.effects.barrier>0){
        for(let j=0;j<10;j++){const a=j*Math.PI/5;orb(x+Math.cos(a)*24,feet+h*.5+Math.sin(a)*40,5,3,3,3,'teal','glow');}
      }
    }else{
      box(x,feet+h*.58,13,width*.65,3,2,boss?'gold':'brick');
      if(body.type==='crawler'){
        orb(x,feet+h*.45,-4,width*1.15,h*.7,32,skin);
        for(const side of [-1,1])for(let j=0;j<3;j++)limb(x+side*16,feet+20-j*3,x+side*(28+j*3),feet+3,8-j*5,5,'boots');
      }
      // All roles are undead: exposed ribs, dead eyes, lesions and clawed hands.
      box(x,feet+h*.54,14,width*.45,h*.2,2,skin);
      for(let j=0;j<3;j++)box(x,feet+h*.48+j*4,16,width*.38,1.5,1,'white');
      orb(x-6,feet+h*.81,12,5,6,2,'brick');
      for(const dy of [-3,0,3])shape('cone',x+face*25,feet+h*.50+dy,10,2,8,2,'white',-face*Math.PI/2,'matte',zAxis);
      if(['brute','charger','leaper','crawler'].includes(body.type)){
        // Mutants keep their combat role but no longer read as ordinary people.
        for(const dx of [-width*.35,width*.35])shape('cone',x+dx,feet+h*.99,0,7,16,8,'white',dx<0?.4:-.4,'matte',zAxis);
        for(const dx of [-6,6])shape('cone',x+dx,feet+h*.72,16,3,8,3,'white',Math.PI);
        for(let j=0;j<3;j++)shape('cone',x-face*width*.42,feet+h*(.43+j*.12),2,6,10,6,'boots',face*Math.PI/2,'matte',zAxis);
      }
      // Ragged hem, exposed rib slashes and asymmetrical scalp stitches.
      for(let j=0;j<3;j++)shape('cone',x-7+j*7,feet+h*.37,11,5,7,3,color,Math.PI);
      for(let j=0;j<3;j++)box(x-4+j*3,feet+h*.52-j*2,14,1.5,7,2,'dark',-.5);
      box(x+6,feet+h*.85,14,1.5,10,1,'brick',.4);
      if(body.type==='brute'||body.type==='crawler'){for(const dx of [-width*.43,width*.43])orb(x+dx,feet+h*.63,1,14,16,19,skin);}
      if(body.type==='runner')box(x,feet+h*.61,14,width*.65,3,2,'gold');
      if(!body.dead && body.type==='shield')box(x+face*17,feet+h*.48,12,7,h*.65,20,body.guardBreak>0?'dark':'blue',0,'metal');
      if(!body.dead && body.type==='thrower')orb(x+face*18,feet+h*.7,12,12,12,12,body.attack<35?'red':'orange','glow');
      if(!body.dead && body.type==='thief'){box(x,feet+h*.65,14,20,5,4,'gold');box(x-face*8,feet+h*.5,-12,16,18,10,'gold');}
      if(!body.dead && body.type==='charger'){for(const dx of [-12,12])box(x+dx,feet+h*.65,10,12,15,14,'orange');}
      if(!body.dead && body.type==='plated' && !body.armorCracked){box(x,feet+h*.53,14,width*.85,h*.4,6,'silver',0,'metal');box(x,feet+h*.9,5,width,7,26,'silver');}
      if(!body.dead && body.type==='medic'){
        box(x,feet+h*.55,14,20,21,5,'white');box(x,feet+h*.55,18,4,15,2,'red');box(x,feet+h*.55,18,14,4,2,'red');
        if(body.attack<30)orb(x,feet+h+9,8,9,9,9,'green','glow');
      }
      if(!body.dead && body.type==='leaper'){
        for(const dx of [-8,8])box(x+dx,feet+12,12,7,18,7,'orange');
        if(body.attack<30)shape('cone',x,feet+h+10,8,12,14,8,'orange',Math.PI);
      }
      if(!body.dead && !boss && body.hp<body.maxHp){
        box(x,feet+h+5,18,width,4,2,'dark',0,'cue');
        const w=(width-2)*Math.max(0,body.hp/body.maxHp);
        box(x-width/2+1+w/2,feet+h+5,20,w,2,2,'#ff675f',0,'cue');
      }
      if(boss)shape('cone',x,feet+h+8,0,width*.9,20,20,'gold');
    }
  }
  function safeHouse(ex,party){
    // Raised Creole porch, weatherboard facade, shutters and ironwork balcony.
    box(ex+100,146,-45,200,164,65,'#4a2864');
    for(let y=72;y<224;y+=12)box(ex+100,y,-10,200,2,3,'#694583');
    box(ex+100,238,-40,218,12,80,'#f8dfaa');box(ex+100,151,0,216,7,95,'#f8dfaa');
    box(ex+100,69,12,218,9,100,'#dfc797');
    for(const dx of [36,164]){
      box(ex+dx,199,-8,33,42,4,'#ffdc83',0,'glow');
      for(const side of [-1,1])box(ex+dx+side*23,199,-4,8,46,5,'#173b33');
      box(ex+dx,199,-3,3,42,3,'#f8dfaa');box(ex+dx,199,-2,33,3,3,'#f8dfaa');
    }
    box(ex+100,104,-7,50,80,5,'#152b28');
    box(ex+100,102,-3,40,76,4,party?'#ffe3a0':'#ceaa57',0,party?'glow':'matte');
    box(ex+100,110,0,28,43,3,'#40335a');orb(ex+115,96,2,3,3,3,'gold');
    for(const dx of [4,61,139,196])box(ex+dx,109,22,6,90,6,'#f8dfaa');
    for(const y of [154,173])box(ex+100,y,36,214,3,3,'#15212a');
    for(let dx=0;dx<=200;dx+=12){box(ex+dx,164,36,2,20,2,'#15212a');orb(ex+dx+6,163,36,6,7,2,'#15212a');}
    const colors=['#9a45d2','#30cb76','#ffd25d'];
    for(let k=0;k<12;k++)shape('cone',ex+k*18,168,40,16,15,2,colors[k%3],Math.PI);
    for(let k=0;k<31;k++)orb(ex+k*6.5,156-Math.sin(k/30*Math.PI)*8,27,4,4,4,colors[k%3]);
    for(const dx of [64,136]){box(ex+dx,129,4,10,18,8,'#162e29');box(ex+dx,129,9,6,11,3,'#ffe3a0',0,'glow');}
    box(ex+100,65,40,72,4,24,'#dfc797');
    // Purple/green/gold sign above the door, kept free of porch supports.
    box(ex+100,214,0,72,18,5,'green');box(ex+100,214,4,66,12,2,'purple');
    for(const [dx,i] of [[-20,0],[220,1]]){
      orb(ex+dx,92,18,16,25,14,colors[i]);orb(ex+dx,113,18,13,13,12,'skin');
      for(const side of [-1,1]){
        limb(ex+dx+side*5,99,ex+dx+side*14,party?119:86,18,4,colors[i]);
        box(ex+dx+side*4,76,18,5,15,5,'dark');
      }
      shape('cone',ex+dx,126,18,18,16,14,colors[(i+2)%3]);
    }
  }
  let previousWidth=0, previousHeight=0, previousRatio=0;
  function fit(){
    canvas.style.width=overlay.style.width;canvas.style.height=overlay.style.height;
    canvas.style.left=overlay.style.left;canvas.style.top=overlay.style.top;
    const width=Math.round(parseFloat(overlay.style.width))||800;
    const height=Math.round(parseFloat(overlay.style.height))||448;
    const ratio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(3000000/(width*height)));
    if(width!==previousWidth || height!==previousHeight || ratio!==previousRatio){
      renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
      previousWidth=width;previousHeight=height;previousRatio=ratio;
    }
  }
  view.render = game => {
    if(!game)return;
    fit();
    for(const b of batches.values())b.count=0;
    const { L, cam, frame, player, effects }=game;
    const course=L.info.course;
    scene.background=new THREE.Color(course.sky);
    scene.fog=new THREE.Fog(course.sky,1150,2100);
    sky.position.x=cam+400;
    if(skyColor!==course.sky){
      skyColor=course.sky;const gradient=skyCtx.createLinearGradient(0,0,0,256);
      gradient.addColorStop(0,'#080e22');gradient.addColorStop(.55,course.sky);gradient.addColorStop(1,course.accent);
      skyCtx.fillStyle=gradient;skyCtx.fillRect(0,0,16,256);skyMap.needsUpdate=true;
    }
    sceneryPass=true;
    // Distant silhouettes shift more slowly than the foreground, adding depth.
    for(let k=-3;k<12;k++){
      const x=Math.floor(cam*.35/180)*180+k*180+cam*.65;
      const height=110+((k+20)*47%150);
      box(x,90+height/2,-610,140,height,80,'#252c46');
      box(x+30,95+height,-610,5,45,5,'#343b59');
    }
    orb(cam+680,390,-720,86,86,14,'#ffdca1','glow');
    camera.position.set(cam+400,444,1000);camera.lookAt(cam+400,224,0);
    const start=Math.max(0,Math.floor(cam/32)-3), end=Math.min(L.W,Math.ceil((cam+800)/32)+4);
    // Deep set dressing: buildings are separate solids behind the gameplay plane.
    for(let k=Math.floor(cam/150)-2;k<Math.ceil((cam+800)/150)+3;k++){
      const x=k*150+75, variation=((k*17+L.i*3)%5+5)%5;
      const height=120+variation*30;
      const colors=['#576782','#786b86','#456b79','#826f71','#586e63'];
      box(x,64+height/2,-200,132,height,95,colors[(variation+L.i)%5]);
      box(x,64+height,-200,143,9,108,'edge');
      box(x-62,64+height+9,-155,4,18,5,'silver');box(x+62,64+height+9,-155,4,18,5,'silver');
      box(x,64+height+17,-155,128,3,4,'dark');
      box(x-58,64+height/2,-149,5,height,4,'brick');box(x+58,64+height/2,-149,5,height,4,'brick');
      box(x,79,-147,26,30,5,'dark');
      if(variation%2===0){box(x+40,64+height+18,-200,20,28,20,'silver',0,'metal');}
      for(let floor=0;floor<3;floor++){
        box(x,88+floor*45,-139,124,3,18,'dark');
        box(x,103+floor*45,-129,124,2,2,'silver');
        for(let rail=-5;rail<=5;rail++)box(x+rail*11,96+floor*45,-129,2,15,2,'dark');
      }
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){
        const wx=x-42+col*42,wy=107+row*45;
        box(wx,wy,-148,24,31,4,'dark');
        box(wx,wy,-145,17,24,3,(row+col+variation)%3===0?'gold':'glass');
        box(wx,wy,-142,2,24,2,'dark');
      }
      if(L.info.loc.id==='lej'||L.info.loc.id==='pi')box(x,90,-143,100,4,4,'green');
      switch(course.element){
        case 'supply': box(x,110,-130,132,12,50,'purple');box(x,113,-100,130,4,5,'gold',0,'glow');
          for(let bulb=-3;bulb<=3;bulb++)orb(x+bulb*19,132+Math.abs(bulb)*2,-95,5,5,5,bulb%2?'purple':'gold','glow');break;
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
    sceneryPass=false;
    // Back retaining wall and luminous lane markers expose road depth.
    for(let x=start;x<end;x++)for(let y=0;y<14;y++){
      const tile=L.grid[y][x];if(tile===' ')continue;
      const wx=x*32+16, wy=448-y*32-16;
      if(tile==='#'){
        box(wx,wy,-9,32,32,100,y===12?'road':'rock');
        if(y===12){
          box(wx,wy+16,38,32,3,5,'#7cfff0',0,'cue');box(wx,wy-2,42,30,22,2,'rock');
          for(const side of [-1,1])if(x+side>=0 && x+side<L.W && L.grid[12][x+side]===' '){
            box(wx+side*14,wy+16,0,3,3,76,'#ff6565',0,'cue');
            box(wx+side*14,wy+7,43,3,20,3,'#ff6565',0,'cue');
          }
          if(x%4===0)box(wx,wy+17,-20,15,1,3,'gold');
          if(x%3===0){box(wx,wy+17,12,18,1,2,'dark');box(wx-7,wy+17,15,2,1,10,'dark');}
        }
      }else{
        const color=tile==='='?'#28788b':tile==='?'?'gold':tile==='M'?'white':tile==='B'?'#d27b38':tile==='H'?'#a85d30':tile==='U'?'#826044':'#c97831';
        box(wx,wy,0,31,32,38,color);
        if(tile==='?'||tile==='M'){const mark=tile==='M'?'red':'purple';box(wx,wy,21,5,17,3,mark);box(wx,wy+3,21,14,5,3,mark);}
        // Dark frame + bright top lip: solid objects read independently of backdrop or hue.
        const topColor=tile==='='?'#7cfff0':'#ffe3a0';
        box(wx,wy+14,21,32,4,3,'#101b29',0,'cue');
        box(wx,wy+14,23,28,2,2,topColor,0,'cue');
        box(wx-14,wy,21,3,32,3,'#101b29',0,'cue');box(wx+14,wy,21,3,32,3,'#101b29',0,'cue');
        box(wx,wy-14,21,32,3,3,'#101b29',0,'cue');
        if(['P','p','H'].includes(tile))for(let stripe=-1;stripe<=1;stripe++)box(wx+stripe*8,wy,22,4,10,2,'#ffe3a0',0,'cue');
      }
    }
    sceneryPass=true;
    for(const prop of L.props){
      if(prop.x<cam-100||prop.x>cam+900)continue;
      if(prop.type==='tree'){
        shape('cylinder',prop.x,112,-85,9,96,9,'trunk');
        orb(prop.x,171,-85,58,61,48,'leaves');orb(prop.x-20,162,-78,40,39,35,'green');orb(prop.x+17,184,-89,36,40,37,'leaves');
      }else if(prop.type==='car'){
        box(prop.x,85,-85,80,26,38,course.accent);box(prop.x,106,-85,45,22,34,'glass');
        for(const dx of [-27,27]){orb(prop.x+dx,72,-62,17,17,9,'dark');orb(prop.x+dx,72,-56,8,8,2,'silver','metal');}
        box(prop.x+39,84,-64,4,9,9,'gold',0,'glow');box(prop.x-39,84,-64,4,9,9,'red',0,'glow');
      }else if(prop.type==='lamp'){
        box(prop.x,131,-65,5,134,5,'dark');box(prop.x+9,201,-65,24,7,16,'gold',0,'glow');
      }
    }
    sceneryPass=false;
    for(const e of L.elements||[]){
      if(e.x<cam-100||e.x>cam+900)continue;
      const phase=(frame+e.phase)%240;
      const hot=['steam','storm'].includes(e.kind)&&phase>=180&&phase<215;
      const warning=phase>=140&&phase<180;
      const danger=['steam','storm','thorn'].includes(e.kind);
      const marker=danger?(e.kind==='thorn'||hot?'#ff6565':warning?'#ffd25d':'#ffad66'):'#7cfff0';
      box(e.x+e.w/2,66,1,e.w,4,72,'#101b29',0,'cue');
      box(e.x+e.w/2,67,37,e.w,3,3,marker,0,'cue');
      if(danger){
        // Stripes remain visible even between attack cycles; red posts bookend the danger span.
        for(let j=0;j<e.w;j+=16)box(e.x+j+4,68,8,8,2,48,marker,0,'cue');
        for(const x of [e.x+3,e.x+e.w-3]){box(x,79,27,4,25,4,'#101b29',0,'cue');orb(x,94,27,7,7,7,marker);}
      }
      if(e.kind==='spring')for(let j=0;j<3;j++)box(e.x+12+j*32,72,0,18,9,22,'green');
      if(e.kind==='thorn')for(let j=0;j<6;j++)shape('cone',e.x+8+j*16,76,0,10,22,10,'#ff6565');
      if(e.kind==='water')box(e.x+e.w/2,70,0,e.w,10,70,'blue');
      if(e.kind==='belt')for(let j=0;j<5;j++)box(e.x+((frame+j*20)%e.w),68,25,10,2,12,'dark');
      if(hot)for(let j=0;j<4;j++){
        if(e.kind==='storm')limb(e.x+12+j*24,68,e.x+8+j*24,146,0,3,'gold');
        else for(let puff=0;puff<3;puff++)orb(e.x+12+j*24,80+((frame*2+puff*24)%75),0,12+puff*6,18,14,'white');
      }
      if(e.kind==='gravity')box(e.x+e.w/2,140+Math.sin(frame*.03)*16,-65,24,24,24,'purple',frame*.02);
    }
    for(const coin of L.bolts)if(!coin.got&&coin.x>cam-30&&coin.x<cam+850){
      kingCake(coin.x,448-coin.y+Math.sin(frame*.08)*2);
    }
    for(const cache of L.pickups||[])if(!cache.got){
      box(cache.x,448-cache.y,0,25,25,25,'teal',frame*.02);box(cache.x,448-cache.y,15,4,16,3,'white');box(cache.x,448-cache.y,15,16,4,3,'white');
    }
    if(L.cargo && !L.cargo.delivered){
      const c=L.cargo,carrier=c.carrier==='partner'&&game.partner&&!game.partner.down?game.partner:player,x=c.carried?carrier.x+carrier.w/2:c.x,y=c.carried?carrier.y-18:c.y;
      box(x,448-y,6,26,26,24,'gold',0,'metal');box(x,448-y,20,4,26,2,'dark');box(x,448-y,20,26,4,2,'white');
    }
    if(L.boss && !L.boss.dead && (L.boss.signatureWarning>0 || L.boss.strikeTicks>0)){
      const b=L.boss;for(const x of (L.info.loc.id==='pi'?b.targets:[b.x+b.w/2])){
        box(x,67,6,52,5,34,b.strikeTicks>0?'#ff6565':'#ffd25d',0,'cue');
        box(x,88,12,4,22,4,'#ffd25d',0,'cue');
      }
    }
    if(L.flagX>0){
      box(L.flagX*32+15,224,0,4,288,4,'silver');
      box(L.flagX*32-7,448-game.flagY-14,0,40,28,4,'purple');
      box(L.flagX*32+15,385,0,12,12,12,'gold');
    }
    if(L.exitX>0 && (L.flagX>0 || L.info.isBoss) && L.exitX*32>cam-250 && L.exitX*32<cam+950)safeHouse(L.exitX*32,!!L.celebration);
    if(L.info.isBoss){
      const region=L.info.loc.id,arenaColor={nola:'purple',la:'orange',hou:'teal',lej:'silver',pi:'gold'}[region];
      for(const x of [21*32,42*32]){
        box(x,140,-70,20,150,24,'dark',0,'scenery');box(x,220,-70,28,8,32,arenaColor,0,'scenery');
        if(region==='nola')shape('cone',x,238,-70,22,32,22,arenaColor);
        if(region==='la')for(let j=-1;j<=1;j++)orb(x+j*8,216,-54,5,5,4,'gold');
        if(region==='hou')box(x,135,-54,6,100,3,arenaColor);
        if(region==='lej')for(let j=0;j<3;j++)box(x,100+j*30,-54,20,8,4,arenaColor);
        if(region==='pi')box(x,185,-54,44,28,3,arenaColor);
      }
    }
    if(L.secretRoute?.kind==='rooftop'){
      const x=L.secretRoute.x+96;
      box(x,140,-80,192,148,48,'#334654',0,'scenery');
      box(x,218,-53,200,8,54,'#526677',0,'scenery');
      for(const dx of [-62,0,62])box(x+dx,160,-53,24,28,3,'glass',0,'scenery');
    }
    for(const z of L.zs)if(z.alive&&z.active&&z.x>cam-80&&z.x<cam+880)person(z,false);
    if(L.boss)person(L.boss,false,true);
    if(L.crate)box(L.crate.x+16,448-L.crate.y-16,0,32,32,32,'gold');
    for(const b of game.bullets){
      const color=b.color||'gold';orb(b.x,448-b.y,10,10,6,6,color,'glow');
      box(b.x-b.vx*.8,448-b.y+b.vy*.8,10,Math.max(10,Math.abs(b.vx)*1.8),2,2,color,0,'glow');
    }
    for(const shot of game.spits)orb(shot.x,448-shot.y,4,12,12,12,'green','glow');
    for(const p of game.parts.slice(-100)){
      if(p.kind==='impact'||p.kind==='dash'||p.kind==='armorbreak')continue;
      if(p.kind==='confetti'){box(p.x,448-p.y,30,4,3,1,p.c,p.spin,'cue');continue;}
      if(p.kind==='powerpop'){box(p.x,448-p.y,12,22,22,12,'teal');box(p.x,448-p.y,20,4,15,3,'white');box(p.x,448-p.y,20,15,4,3,'white');continue;}
      if(p.kind==='boltpop'){kingCake(p.x,448-p.y);continue;}
      if(p.kind==='blast'||p.kind==='frostpulse'){
        const r=p.r*(1-p.t/(p.kind==='blast'?16:20));
        for(let j=0;j<16;j++){const a=j*Math.PI/8;orb(p.x+Math.cos(a)*r,448-p.y+Math.sin(a)*r,12,4,4,4,p.kind==='blast'?'orange':'teal','glow');}continue;
      }
      const dust=p.kind==='puff',size=dust?Math.max(2,7*p.t/14):4;
      orb(p.x,448-p.y,8,size,size,size,dust?'silver':p.kind==='gore'?'red':'gold',p.kind==='spark'?'glow':'matte');
    }
    if(game.partner&&!game.partner.down&&!(game.partner.inv>0&&frame%6<3))person(game.partner,true);
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
    status.textContent='CYAN EDGE: LAND · AMBER FRAME: SOLID · STRIPES: DANGER';
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
