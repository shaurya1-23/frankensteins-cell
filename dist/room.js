import * as T from './assets/three.module.js';
import {createSoftwareRenderer} from './software-renderer.js';

const TAU = Math.PI * 2;
let seed = 46319;
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
const between = (min, max) => min + random() * (max - min);
const vec = (x, y, z) => new T.Vector3(x, y, z);
const palette = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

function texture(paint, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}
function woodTexture() {
  return texture((ctx, n) => {
    const gradient = ctx.createLinearGradient(0, 0, n, 0);
    gradient.addColorStop(0, '#60452e');
    gradient.addColorStop(.2, '#8b6746');
    gradient.addColorStop(.8, '#9b7550');
    gradient.addColorStop(1, '#473221');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 3100; i++) {
      const x = between(0, n), y = between(-n, n), wave = between(0, 7);
      ctx.strokeStyle = random() > .54 ? '#30190b' : '#cfaa70';
      ctx.globalAlpha = between(.03, .29);
      ctx.lineWidth = between(.25, 2.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + wave, y + 58, x - wave, y + 137, x, y + between(150, 510));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
}
function plasterTexture() {
  return texture((ctx, n) => {
    ctx.fillStyle = '#80786b';
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 4000; i++) {
      const x = between(0, n), y = between(0, n), r = between(1, 38);
      const d = ctx.createRadialGradient(x, y, 0, x, y, r);
      d.addColorStop(0, random() > .45 ? '#c8b59730' : '#2b231c35');
      d.addColorStop(1, '#b59b7200');
      ctx.fillStyle = d;
      ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    ctx.strokeStyle = '#40392955';
    for (let i = 0; i < 20; i++) {
      let x = between(0,n), y = between(0,n);
      ctx.beginPath();
      ctx.moveTo(x,y);
      for(let j=0;j<8;j++){x+=between(-13,12);y+=between(2,14);ctx.lineTo(x,y);}
      ctx.stroke();
    }
  });
}
function clothTexture() {
  return texture((ctx,n)=>{
    ctx.fillStyle = '#888170';
    ctx.fillRect(0,0,n,n);
    for(let i=0;i<n;i+=2){
      ctx.fillStyle=i%4?'#b5a99865':'#493d3555';
      ctx.fillRect(i,0,1,n);
      ctx.fillRect(0,i,n,1);
    }
  },128);
}
function pageTexture() {
  return texture((ctx,n)=>{
    ctx.fillStyle='#bca27a'; ctx.fillRect(0,0,n,n);
    for(let i=0;i<1500;i++){
      ctx.fillStyle=random()>.5?'#f4d39650':'#73522f33';
      ctx.fillRect(between(0,n),between(0,n),between(1,10),between(1,4));
    }
    ctx.strokeStyle='#372b22';
    ctx.lineWidth=1.7;
    for(let i=0;i<21;i++){
      let x=between(24,49), y=45+i*20;
      for(let j=0;j<18 && x<450;j++){
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.quadraticCurveTo(x+between(3,9),y-between(2,7),x+between(10,17),y+between(-4,5));
        ctx.stroke();x+=between(10,33);
      }
    }
    ctx.strokeStyle='#702e26';ctx.beginPath();ctx.moveTo(31,38);ctx.lineTo(479,38);ctx.stroke();
  });
}
function spotTexture() {
  return texture((ctx,n)=>{
    const g=ctx.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
    g.addColorStop(0,'#090709cc');g.addColorStop(.39,'#0d090b8c');g.addColorStop(1,'#13080c00');
    ctx.fillStyle=g;ctx.fillRect(0,0,n,n);
  },128);
}

export function createWorkshop(canvas) {
  const context = canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});
  const renderer = context ? new T.WebGLRenderer({canvas,context,antialias:true}) : createSoftwareRenderer(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.27;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.background = new T.Color('#111822');
  scene.fog = new T.FogExp2('#242632', .020);
  const camera = new T.PerspectiveCamera(65,1,.045,58);

  const timberMap = woodTexture();
  const woodFallback = timberMap.clone();
  woodFallback.repeat.set(5,5);
  const roof = [];
  const exteriorScenery = [];
  const wallFallback = plasterTexture();
  wallFallback.repeat.set(2,1.2);
  const linenFallback = clothTexture();
  linenFallback.repeat.set(2,2);
  const ambientSpot = spotTexture();
  const material = (color, options={}) => new T.MeshStandardMaterial({color,roughness:.85,...options});
  const timber = material('#746049',{map:timberMap,bumpMap:timberMap,bumpScale:.034});
  const paleTimber = material('#a28260',{map:timberMap,bumpMap:timberMap,bumpScale:.023});
  const beam = material('#4a3b2c',{map:timberMap,bumpMap:timberMap,bumpScale:.028});
  const floorMat = material('#978570',{map:woodFallback,bumpMap:woodFallback,bumpScale:.032,roughness:.79});
  const plaster = material('#a29a8b',{map:wallFallback,bumpMap:wallFallback,bumpScale:.055});
  const ceilingMat = material('#5a4b3e',{map:woodFallback,bumpMap:woodFallback,bumpScale:.036});
  
  const iron = material('#575355',{metalness:.68,roughness:.43});
  const brass = material('#a47a45',{metalness:.59,roughness:.34});
  const parchment = material('#e1c79a',{map:pageTexture(),roughness:.93});
  const paperEdge = material('#a99778');
  const skin = material('#9b9175',{roughness:.75});
  const hair = material('#211b1a');
  const boot = material('#362a23',{roughness:.74});
  const cloth = material('#786a59',{map:linenFallback,bumpMap:linenFallback,bumpScale:.023});
  const darkCloth = material('#494c45',{map:linenFallback,bumpMap:linenFallback,bumpScale:.026});
  const bone = material('#aa9f82',{roughness:.94});
  const stain = material('#473a30');
  const wax = material('#b4a17b',{roughness:.66,emissive:'#b2622f',emissiveIntensity:.05});
  const wick = material('#201616');

  const loader = new T.TextureLoader();
  function swapTexture(target, name, repeat, bump) {
    loader.load(`assets/${name}.webp`, map => {
      map.wrapS = map.wrapT = T.RepeatWrapping;
      map.repeat.set(...repeat);
      map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
      target.map = map;
      target.bumpMap = map;
      target.bumpScale = bump;
      target.needsUpdate = true;
    },undefined,()=>{});
  }
  swapTexture(floorMat,'oak',[2,2],.035);
  swapTexture(plaster,'plaster',[2,1],.057);
  swapTexture(cloth,'linen',[2,2],.018);
  swapTexture(darkCloth,'linen',[2,2],.017);

  const boxGeometry = new T.BoxGeometry(1,1,1);
  const sphereGeometry = new T.SphereGeometry(1,18,13);
  const cylinderGeometry = new T.CylinderGeometry(1,1,1,16);
  function part(geometry, mat, x,y,z, w=1,h=1,d=1, parent=scene, shadow=true) {
    const o = new T.Mesh(geometry,mat);
    o.position.set(x,y,z);
    o.scale.set(w,h,d);
    o.castShadow=shadow;
    o.receiveShadow=true;
    parent.add(o);
    return o;
  }
  const box = (x,y,z,w,h,d,m,p=scene,shadow=true) => part(boxGeometry,m,x,y,z,w,h,d,p,shadow);
  const orb = (x,y,z,w,h,d,m,p=scene,shadow=true) => part(sphereGeometry,m,x,y,z,w,h,d,p,shadow);
  const cyl = (x,y,z,r,h,m,p=scene,shadow=true) => part(cylinderGeometry,m,x,y,z,r,h,r,p,shadow);
  function segment(a,b,r,m,p=scene) {
    const mid=a.clone().add(b).multiplyScalar(.5);
    const o=cyl(mid.x,mid.y,mid.z,r,a.distanceTo(b),m,p);
    o.quaternion.setFromUnitVectors(vec(0,1,0),b.clone().sub(a).normalize());
    return o;
  }
  function group(x,y,z,parent=scene) {
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;
  }
  function contact(x,z,w,d) {
    const m = new T.MeshBasicMaterial({map:ambientSpot,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
    const o=part(new T.PlaneGeometry(1,1),m,x,.013,z,w,d,1,scene,false);
    o.rotation.x=-Math.PI/2;
  }
  function wall(x,z,w,d,h=3.35,centerY=h/2) {
    box(x,centerY,z,w,h,d,plaster,scene,false);
  }

  // Keep the gallery and door opening aligned with the source map.
  box(0,-.13,0,10.8,.26,8.8,floorMat,scene,false);
  box(-8,-.13,2.15,5.2,.26,2.75,floorMat,scene,false);
  wall(5.46,0,.19,8.8);
  wall(0,4.48,11.1,.19);
  wall(-5.47,-1.81,.20,5.19);
  wall(-5.47,3.96,.20,1.04);
  wall(-8.02,.73,5.20,.18,2.96);
  wall(-8.02,3.56,5.20,.18,2.96);
  wall(-10.64,2.15,.18,2.75,2.96);

  // North wall with a glazed opening and an outdoor recess.
  const wx=3.22, wz=-4.42, ww=1.68;
  wall(-1.48,wz,7.72,.2);
  wall(4.76,wz,1.43,.2);
  wall(wx,wz,ww,.2,1.02,.51);
  wall(wx,wz,ww,.2,.79,2.96);
  roof.push(box(0,3.42,0,11,.15,9,ceilingMat,scene,false));
  roof.push(box(-8.04,3.01,2.14,5.3,.13,2.85,ceilingMat,scene,false));
  for (const z of [-3.65,-1.87,-.02,1.83,3.69]) {
    roof.push(box(0,3.21,z,10.95,.27,.23,beam));
    for (const x of [-5.20,5.20]) {
      roof.push(segment(vec(x,2.58,z),vec(x*.87,3.18,z),.092,beam));
    }
  }
  for (const x of [-5.25,-2.65,.01,2.62,5.23]) box(x,1.66,4.34,.15,3.34,.14,beam);
  for (const x of [-4.99,-2.49,-.05,2.34,4.12,5.26]) box(x,1.66,-4.30,.13,3.34,.13,beam);
  for (const z of [-4.25,-2.13,.06,2.12,4.28]) box(5.31,1.66,z,.14,3.34,.14,beam);
  box(0,.14,4.34,10.8,.27,.13,beam);
  box(0,.14,-4.32,10.8,.27,.13,beam);
  box(5.32,.14,0,.13,.27,8.8,beam);
  box(-5.32,.14,-1.8,.13,.27,5.2,beam);
  box(-5.4,2.35,2.13,.29,.22,2.68,beam);
  box(-5.4,1.15,.88,.28,2.33,.16,beam);
  box(-5.4,1.15,3.42,.28,2.33,.16,beam);
  const door=group(-5.38,0,.88);
  door.rotation.y=-.84;
  box(-.65,1.04,0,1.27,2.06,.075,timber,door);
  for (const x of [-1.18,-.86,-.54,-.22]) box(x,1.03,.041,.018,1.96,.016,beam,door);
  for (const y of [.34,1.73]) box(-.65,y,.06,1.19,.105,.026,iron,door);
  orb(-1.15,1.02,.105,.055,.055,.041,brass,door);
  for (const z of [.84,3.46]) {
    box(-8.02,.14,z,5.2,.28,.09,beam);
    for(const x of [-10.4,-8.8,-7.1,-5.64]) box(x,1.47,z,.14,2.96,.14,beam);
  }
  for (let i=0;i<7;i++) {
    const x=-8.98-i*.235;
    box(x,.027+i*.027,2.14,.235,.065+i*.054,2.39,timber);
    box(x+.104,.064+i*.055,2.14,.034,.035,2.42,paleTimber);
  }
  for (const x of [-10.31,-9.49,-8.78]) box(x,.49,3.25,.09,.96,.09,beam);
  box(-9.56,.95,3.25,1.67,.10,.10,paleTimber);

  // Window frames, glass, rain and distant roof silhouettes.
  box(wx,1.006,wz+.10,2.06,.115,.48,paleTimber);
  for(const x of [wx-.84,wx,wx+.84]) box(x,1.79,wz+.048,.087,1.57,.16,beam);
  for(const y of [1.04,1.48,1.99,2.56]) box(wx,y,wz+.046,1.76,.075,.16,beam);
  const glass = new T.MeshPhysicalMaterial({color:'#819cb6',roughness:.2,metalness:.12,transparent:true,opacity:.14,depthWrite:false});
  box(wx,1.80,wz-.045,1.63,1.48,.025,glass,scene,false);
  const exterior = new T.MeshBasicMaterial({color:'#1a2638',fog:false});
  const roofs = new T.MeshBasicMaterial({color:'#10151f',fog:false});
  exteriorScenery.push(box(2,3,-13,25,12,.1,exterior,scene,false));
  for(let i=0;i<8;i++){
    const x=-4.6+i*1.85,h=between(1.55,2.88);
    exteriorScenery.push(box(x,h/2-.64,-10.4,1.78,h,1,roofs,scene,false));
    const roof=part(new T.ConeGeometry(1,1,4),roofs,x,h-.31,-10.4,1.33,.75,1.28,scene,false);
    roof.rotation.y=Math.PI/4;
    exteriorScenery.push(roof);
  }
  const moon = new T.MeshBasicMaterial({color:'#d1dbee',fog:false});
  exteriorScenery.push(orb(5.31,4.2,-12,.36,.36,.06,moon,scene,false));
  const rainGeo=new T.BufferGeometry();
  const rainData=new Float32Array(150*6);
  const drops=Array.from({length:150},()=>({x:between(wx-2,wx+2),y:between(.62,3.6),z:between(-6.0,-4.59),speed:between(1.9,4.1),length:between(.045,.25)}));
  rainGeo.setAttribute('position',new T.BufferAttribute(rainData,3));
  const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#abc4e1',transparent:true,opacity:.45}));
  rain.frustumCulled=false;
  scene.add(rain);

  // Workbench furniture and props.
  function table(x,z,w,d) {
    const g=group(x,0,z);
    box(0,.98,0,w,.14,d,paleTimber,g);
    box(0,.84,-d*.37,w*.94,.18,.10,timber,g);
    box(0,.84,d*.37,w*.94,.18,.10,timber,g);
    for(const xx of [-w*.44,w*.44])for(const zz of [-d*.34,d*.34])box(xx,.46,zz,.133,.91,.135,timber,g);
    box(0,.32,0,w*.88,.075,d*.73,beam,g);
    for(let i=1;i<5;i++)box(0,1.051,(i/5-.5)*d,w,.004,.008,beam,g,false);
    contact(x,z,w*1.22,d*1.46);
    return g;
  }
  const bench=table(-.36,-3.53,6.32,1.29);
  const side=table(4.53,-2.03,1.06,1.72);
  const galleryTable=table(-7.92,.98,1.1,.47);
  function book(x,y,z,w,d,ry,cover,parent=scene,open=false) {
    const g=group(x,y,z,parent);g.rotation.y=ry;
    if(open){
      box(0,.018,0,w,.037,d,cover,g);
      for(const side of [-1,1]){
        const stack=box(side*w*.237,.040,0,w*.47,.036,d*.94,paperEdge,g);
        const page=box(side*w*.237,.061,0,w*.47,.007,d*.91,parchment,g);
        stack.rotation.z=page.rotation.z=side*-.055;
      }
      box(0,.043,0,.013,.032,d*.95,stain,g);
    }else{
      box(0,.037,0,w,.060,d,cover,g);
      box(.009,.035,.007,w*.92,.042,d*.91,paperEdge,g);
      box(0,.069,0,w,.013,d,cover,g);
      box(-w*.48,.036,0,.024,.072,d,cover,g);
      for(const zz of [-d*.42,d*.42])box(0,.077,zz,w*.86,.003,.007,brass,g,false);
    }
  }
  const brownLeather=material('#4b2c25'), redLeather=material('#64342b'), greenLeather=material('#37443e');
  book(-2.39,1.054,.23,.91,.57,-.16,redLeather,bench,true);
  book(-1.68,1.054,-.33,.47,.62,-.16,greenLeather,bench);
  book(-1.68,1.13,-.31,.38,.51,.11,brownLeather,bench);
  book(0,1.06,0,.32,.38,.14,redLeather,galleryTable);

  const glassMaterials=['#435944','#5b422c','#49626b','#7c6649'].map(color=>new T.MeshPhysicalMaterial({
    color,roughness:.23,metalness:.20,clearcoat:.75,clearcoatRoughness:.19
  }));
  function bottle(x,y,z,r,h,i,p=scene) {
    const profile=[[0,0],[.72,.01],[.98,.08],[1,.50],[.95,.62],[.46,.76],[.30,.80],[.30,.96],[.40,.98],[.40,1],[.26,1]];
    const geom=new T.LatheGeometry(profile.map(([a,b])=>new T.Vector2(a*r,b*h)),16);
    part(geom,glassMaterials[i%4],x,y,z,1,1,1,p);
    cyl(x,y+h*1.01,z,r*.27,h*.12,stain,p);
    if(i%3===1)box(x,y+h*.40,z+r*.96,r*1.18,h*.22,.012,paperEdge,p);
  }
  for(let i=0;i<13;i++){
    const x=between(.15,2.65), z=between(-.47,.45);
    bottle(x,1.055,z,between(.045,.11),between(.17,.40),i,bench);
  }
  for(let i=0;i<5;i++) bottle(between(-.25,.25),1.055,between(-.6,.6),between(.047,.102),between(.16,.32),i+1,side);

  function crate(x,y,z,w,h,d,p=scene) {
    const g=group(x,y,z,p);
    box(0,h/2,0,w,h,d,timber,g);
    for(const xx of [-w*.41,w*.41])box(xx,h/2,d/2+.014,.065,h,.026,paleTimber,g);
    for(const yy of [h*.22,h*.50,h*.78])box(0,yy,d/2+.003,w,.012,.009,beam,g,false);
    for(const xx of [-w*.41,w*.41])for(const yy of [h*.19,h*.83])orb(xx,yy,d/2+.029,.011,.011,.005,iron,g,false);
    return g;
  }
  crate(-2.65,0,3.85,.83,.52,.56);
  crate(-3.61,0,3.95,.79,.41,.50);
  crate(4.71,0,3.75,.83,.54,.64);
  crate(0,.36,0,.83,.37,.49,bench);
  crate(1.15,.36,0,.49,.24,.44,bench);

  const shelf=group(-.45,0,-4.20);
  for(const y of [1.65,2.20]){
    box(0,y,0,5.10,.09,.43,timber,shelf);
    for(const x of [-2.32,-.50,1.49,2.31])box(x,y-.14,-.035,.065,.28,.34,beam,shelf);
    for(let i=0;i<9;i++)bottle(-2.21+i*.52,y+.048,.035,between(.05,.09),between(.17,.32),i,shelf);
  }
  for(let i=0;i<7;i++){
    const x=-4.42+i*.17, h=between(.23,.41);
    box(x,1.66+h*.5,-4.14,.13,h,.22,[greenLeather,brownLeather,redLeather][i%3]);
    for(const y of [1.69,1.61+h])box(x,y,-4.024,.10,.012,.014,brass);
  }
  box(-3.9,1.64,-4.18,1.39,.1,.37,timber);
  box(-4.37,1.48,-4.23,.10,.28,.23,beam);

  function drape(x,y,z,w,d,drop,mat,parent=scene) {
    const geometry=new T.PlaneGeometry(w,d,28,18);
    geometry.rotateX(-Math.PI/2);
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const xx=pos.getX(i),zz=pos.getZ(i);
      const ripple=Math.sin(xx*37+zz*5)*.017+Math.cos(xx*18-zz*7)*.025;
      const hem=Math.pow(Math.max(0,(zz/d+.5)-.63)/.37,1.55)*drop;
      pos.setY(i,ripple-hem);
    }
    geometry.computeVertexNormals();
    part(geometry,mat,x,y,z,1,1,1,parent);
  }
  drape(-.67,1.095,.21,.96,.91,.30,cloth,bench);
  drape(.13,.07,2.66,1.5,.94,0,cloth);
  function specimen(a,b,r,parent=scene) {
    segment(a,b,r,bone,parent);
    for(const v of [a,b]){
      orb(v.x-r*.55,v.y,v.z,r*1.17,r*.86,r*1.05,bone,parent);
      orb(v.x+r*.50,v.y,v.z,r*1.12,r*.83,r*1.04,bone,parent);
    }
  }
  specimen(vec(-1.04,1.12,.03),vec(-.38,1.12,.20),.037,bench);
  specimen(vec(-.95,1.12,.27),vec(-.45,1.12,.41),.028,bench);
  const dishGeometry=new T.LatheGeometry([[0,0],[.11,0],[.15,.028],[.21,.074],[.209,.082],[.195,.075],[.131,.024],[0,.019]].map(v=>new T.Vector2(...v)),28);
  part(dishGeometry,brass,1.13,.021,.52);
  part(dishGeometry,iron,3.13,.021,1.45);
  function tool(x,z,angle,style) {
    const g=group(x,.026,z);g.rotation.y=angle;
    if(style===0) {
      segment(vec(0,0,-.12),vec(0,0,.23),.018,iron,g);
      segment(vec(0,0,-.17),vec(0,0,-.035),.027,paleTimber,g);
      box(0,0,.22,.057,.018,.11,iron,g);
    } else {
      for(const sign of [-1,1]){
        segment(vec(sign*.059,.001,-.085),vec(0,.007,.055),.013,iron,g);
        segment(vec(0,.007,.055),vec(sign*.029,.001,.25),.012,iron,g);
        const ring=part(new T.TorusGeometry(.037,.008,8,16),iron,sign*.064,0,-.104,1,1,1,g);
        ring.rotation.x=-Math.PI/2;
      }
    }
  }
  tool(.35,.73,.4,1);tool(.73,1.42,-.71,0);tool(2.91,.86,.58,0);tool(3.08,-.15,-1.27,1);
  bottle(2.93,.012,.49,.065,.16,1);
  bottle(.55,.012,-.11,.071,.22,2);
  contact(1.6,.65,3.47,1.40);

  // The Creature lies on the boards. Layered fabric and boots suggest a period figure.
  const creature=group(1.63,.015,.55);
  creature.rotation.y=-1.29;
  orb(0,.222,-.55,.273,.200,.36,darkCloth,creature);
  orb(0,.177,-.17,.216,.151,.31,darkCloth,creature);
  orb(0,.132,.10,.214,.122,.21,boot,creature);
  orb(0,.189,-.876,.100,.10,.105,skin,creature);
  orb(0,.175,-1.078,.173,.114,.245,hair,creature);
  orb(0,.211,-1.043,.133,.114,.177,skin,creature);
  orb(0,.328,-1.037,.022,.032,.045,skin,creature);
  orb(0,.302,-.965,.072,.031,.037,skin,creature);
  const eyeMat=material('#9b813c',{emissive:'#9c6b20',emissiveIntensity:.2,roughness:.51});
  orb(-.050,.310,-1.081,.026,.012,.013,stain,creature);
  orb(.050,.310,-1.081,.026,.012,.013,stain,creature);
  orb(.054,.321,-1.081,.010,.003,.009,eyeMat,creature);
  for(let i=0;i<17;i++) {
    const x=between(-.17,.17), z=between(-1.27,-1.14);
    orb(x,.157,z,between(.012,.03),.023,between(.04,.12),hair,creature,false);
  }
  for(const s of [-1,1]){
    const thigh=orb(s*.116,.136,.39,.112,.112,.36,darkCloth,creature);
    thigh.rotation.y=s*.07;
    const calf=orb(s*.154,.105,.83,.082,.080,.30,darkCloth,creature);
    calf.rotation.y=s*.06;
    orb(s*.167,.092,1.052,.097,.091,.20,boot,creature);
    orb(s*.174,.109,1.207,.093,.099,.146,boot,creature);
    const upper=orb(s*.278,.176,-.51,.075,.096,.246,darkCloth,creature);
    upper.rotation.y=s*.32;
    const lower=orb(s*.362,.117,-.174,.063,.064,.187,darkCloth,creature);
    lower.rotation.y=s*.16;
    orb(s*.38,.100,.019,.049,.043,.096,skin,creature);
    for(let i=0;i<4;i++)orb(s*.385+(i-1.5)*.018,.081,.073,.010,.018,.042-i*.004,skin,creature,false);
  }
  for(let i=0;i<6;i++)orb(.015,.391-i*.019,-.68+i*.091,.012,.006,.012,brass,creature,false);
  const fabricMat=cloth.clone(); fabricMat.side=T.DoubleSide;
  drape(-.08,.19,.32,.52,.82,.14,fabricMat,creature);

  // Candles, flames, and mixed moonlight.
  const flameOuter = new T.MeshBasicMaterial({color:'#ff8835',transparent:true,opacity:.85});
  const flameInner = new T.MeshBasicMaterial({color:'#fff1b4'});
  const flames=[];
  function candle(x,y,z,h,power,distance,shadow=false) {
    part(dishGeometry,brass,x,y,z,.64,.49,.64,scene,true);
    cyl(x,y+h*.50+.017,z,.043,h,wax);
    for(let i=0;i<4;i++)orb(x+between(-.039,.039),y+h*.35,z+between(-.033,.033),.011,.038,.012,wax,scene,false);
    cyl(x,y+h+.024,z,.006,.027,wick,scene,false);
    const outer=orb(x,y+h+.066,z,.024,.055,.023,flameOuter,scene,false);
    const inner=orb(x,y+h+.061,z,.013,.034,.013,flameInner,scene,false);
    const bulb=new T.PointLight('#ffc086',power,distance,1.52);
    bulb.position.set(x,y+h+.12,z+.06);
    if(shadow) {
      bulb.castShadow=true;
      bulb.shadow.mapSize.set(512,512);
      bulb.shadow.bias=-.0014;
      bulb.shadow.normalBias=.026;
      bulb.shadow.camera.near=.085;
      bulb.shadow.camera.far=distance;
    }
    scene.add(bulb);
    flames.push({outer,inner,bulb,power,phase:random()*TAU});
  }
  candle(3.31,1.064,-4.09,.093,30,8.5,true);
  candle(-2.49,1.062,-3.24,.162,24,7.2,true);
  candle(-7.75,1.055,1.06,.143,17,5.6);
  candle(4.58,1.062,-1.70,.12,11,4.5);

  const fill=new T.HemisphereLight('#a8b3cb','#655142',.54);
  scene.add(fill);
  const moonlight=new T.SpotLight('#a9c6ff',63,13,Math.PI/5,.70,1.39);
  moonlight.position.set(wx,2.47,-4.02);
  moonlight.target.position.set(.34,.18,1.06);
  moonlight.castShadow=true;
  moonlight.shadow.mapSize.set(1024,1024);
  moonlight.shadow.bias=-.0013;
  moonlight.shadow.normalBias=.022;
  scene.add(moonlight,moonlight.target);
  const bounce=new T.PointLight('#839ac5',5.4,8.4,1.5);
  bounce.position.set(2.6,2.83,1.7);scene.add(bounce);
  const galleryAmbient=new T.PointLight('#b68058',6.5,6.7,1.5);
  galleryAmbient.position.set(-7.74,2.1,2.15);scene.add(galleryAmbient);

  // The bedroom is a separate plan inset. Its location in the house is unspecified.
  const bedX=-8.14, bedZ=-2.91;
  const bedroom=group(bedX,0,bedZ);
  box(0,-.13,.48,4.38,.26,4.59,floorMat,bedroom,false);
  const bedroomWall=(x,z,w,d,h=2.78,y=h/2)=>box(x,y,z,w,h,d,plaster,bedroom,false);
  bedroomWall(-2.19,.48,.16,4.59);
  bedroomWall(2.19,.48,.16,4.59);
  bedroomWall(0,2.78,4.54,.16);
  bedroomWall(-1.54,-1.81,1.30,.16);
  bedroomWall(1.31,-1.81,1.76,.16);
  bedroomWall(-.21,-1.81,1.36,.16,.94,.47);
  bedroomWall(-.21,-1.81,1.36,.16,.43,2.56);
  const bedroomRoof=box(0,2.82,.48,4.52,.10,4.65,ceilingMat,bedroom,false);
  roof.push(bedroomRoof);
  box(-.21,.94,-1.70,1.55,.08,.29,paleTimber,bedroom);
  box(-.21,2.36,-1.80,1.42,.08,.15,beam,bedroom);
  for(const x of [-.87,-.21,.45])box(x,1.65,-1.81,.07,1.46,.16,beam,bedroom);
  const nightGlass=new T.MeshBasicMaterial({color:'#252d3b'});
  box(-.21,1.65,-1.89,1.34,1.38,.03,nightGlass,bedroom,false);
  for(const x of [-1.04,.62]){
    box(x,1.65,-1.70,.25,1.39,.055,timber,bedroom);
    for(let i=0;i<6;i++)box(x,1.08+i*.22,-1.662,.23,.035,.019,beam,bedroom);
  }
  const bed=group(-.74,0,-.29,bedroom);
  box(0,.37,0,1.46,.23,2.24,timber,bed);
  box(0,.58,0,1.37,.24,2.14,cloth,bed);
  box(0,.68,-1.05,1.53,.63,.13,paleTimber,bed);
  for(const x of [-.73,.73])for(const z of [-1.09,1.09]){
    box(x,1.04,z,.087,2.02,.087,timber,bed);
    orb(x,2.09,z,.077,.092,.077,paleTimber,bed);
  }
  for(const z of [-1.09,1.09])box(0,1.96,z,1.48,.05,.055,brass,bed);
  for(const x of [-.73,.73])box(x,1.96,0,.055,.05,2.16,brass,bed);
  orb(-.29,.71,-.74,.29,.086,.25,cloth,bed);
  orb(.29,.71,-.74,.29,.086,.25,cloth,bed);
  drape(0,.727,.24,1.39,1.49,.12,darkCloth,bed);
  const curtain=new T.PlaneGeometry(1.46,1.41,28,14);
  const curtainPoints=curtain.attributes.position;
  for(let i=0;i<curtainPoints.count;i++){
    const x=curtainPoints.getX(i),y=curtainPoints.getY(i);
    curtainPoints.setXYZ(i,x+.18*(1-y/.705),y,Math.sin(x*37+y*3)*.062);
  }
  curtain.computeVertexNormals();
  const curtainMat=material('#66473f',{map:linenFallback,side:T.DoubleSide});
  part(curtain,curtainMat,.03,1.24,-1.079,1,1,1,bed);
  box(1.48,.48,-.92,.68,.92,.61,timber,bedroom);
  box(1.48,.97,-.92,.74,.08,.67,paleTimber,bedroom);
  candle(bedX+1.49,1.01,bedZ-.92,.12,15,5.1);
  const bedroomFill=new T.PointLight('#9ab3eb',12,5.5,1.4);
  bedroomFill.position.set(bedX-.21,2.04,bedZ-1.59);
  scene.add(bedroomFill);

  const markers=[
    {id:1,x:-9.03,y:1.16,z:2.20},
    {id:2,x:-5.04,y:1.84,z:2.05},
    {id:3,x:-1.27,y:1.53,z:-3.30},
    {id:4,x:3.25,y:1.77,z:-4.03},
    {id:5,x:.50,y:.65,z:1.20},
    {id:6,x:2.29,y:.80,z:.40},
    {id:7,x:bedX-.32,y:1.69,z:bedZ-.38}
  ];
  let isOverhead;
  function setOverhead(enabled) {
    if(enabled===isOverhead)return;
    isOverhead=enabled;
    for(const object of [...roof,...exteriorScenery])object.visible=!enabled;
    rain.visible=!enabled;
  }
  function animate(time,dt) {
    for (const f of flames) {
      const flicker=1+Math.sin(time*13+f.phase)*.057+Math.sin(time*31+f.phase)*.047;
      f.bulb.intensity=f.power*flicker;
      f.outer.scale.y=.054*flicker;
      f.inner.scale.y=.034*flicker;
      f.outer.rotation.z=Math.sin(time*7+f.phase)*.16;
    }
    drops.forEach((d,i)=>{
      d.y-=dt*d.speed;
      if(d.y<.63)d.y=3.58;
      const off=i*6;
      rainData.set([d.x,d.y,d.z,d.x+.019,d.y-d.length,d.z],off);
    });
    rainGeo.attributes.position.needsUpdate=true;
  }
  return {renderer,scene,camera,markers,setOverhead,animate};
}
