import * as T from './assets/three.module.js';

const near = .075;
const back = 29;
const white = new T.Color(0xffffff);
const work = new T.Vector3();
const normal = new T.Vector3();
const matrix = new T.Matrix4();
const direction = new T.Vector3();
const midpoint = new T.Vector3();
const lights = [
  {x:3.31,y:1.32,z:-4.09,r:1.0,g:.56,b:.27,power:1.65},
  {x:-2.49,y:1.35,z:-3.24,r:1.0,g:.52,b:.25,power:1.35},
  {x:-7.75,y:1.35,z:1.06,r:1.0,g:.53,b:.31,power:1.08},
  {x:4.58,y:1.32,z:-1.70,r:1.0,g:.54,b:.28,power:.52},
  {x:2.92,y:2.51,z:-4.01,r:.31,g:.51,b:1.0,power:1.75},
  {x:-6.65,y:1.22,z:-3.83,r:1.0,g:.54,b:.30,power:1.4},
  {x:-8.35,y:2.04,z:-4.50,r:.31,g:.51,b:1.0,power:1.05}
];

function tint(material, illumination) {
  const {r,g,b}=material.color||white;
  const glow=material.emissive||{r:0,g:0,b:0};
  const encode=value=>Math.round(255*Math.pow(Math.min(1,Math.max(0,value)),.455));
  return `rgb(${encode(r*illumination[0]+glow.r*.28)},${encode(g*illumination[1]+glow.g*.28)},${encode(b*illumination[2]+glow.b*.28)})`;
}
function interpolate(a,b,t) {
  return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near,a[3]+(b[3]-a[3])*t,a[4]+(b[4]-a[4])*t];
}
function clip(vertices) {
  const output=[];
  for(let i=0;i<vertices.length;i++){
    const a=vertices[i],b=vertices[(i+1)%vertices.length];
    if(a[2]>=near)output.push(a);
    if((a[2]>=near)!==(b[2]>=near))output.push(interpolate(a,b,(near-a[2])/(b[2]-a[2])));
  }
  return output;
}
function face(vertices,material,mesh,mapUV) {
  const [a,b,c]=vertices;
  const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  const center=vertices.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/vertices.length);
  return {vertices,material,mesh,n,center,uv:mapUV};
}
function unitCorners(axis,sign) {
  const pairs=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
  const vertices=pairs.map(([a,b])=>axis===0?new T.Vector3(sign*.5,a,b):axis===1?new T.Vector3(b,sign*.5,a):new T.Vector3(a,b,sign*.5));
  const d=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).getComponent(axis);
  return d*sign>0?vertices:vertices.reverse();
}
function buildMesh(mesh) {
  const {geometry,material,matrixWorld}=mesh;
  const faces=[];
  if(geometry.type==='BoxGeometry') {
    for(let axis=0;axis<3;axis++){
      for(const sign of [-1,1]){
        const [a,b,c,d]=unitCorners(axis,sign);
        const corner=(u,v)=>a.clone().lerp(b,u).lerp(d.clone().lerp(c,u),v).applyMatrix4(matrixWorld);
        const width=corner(0,0).distanceTo(corner(1,0));
        const height=corner(0,0).distanceTo(corner(0,1));
        const nx=Math.max(1,Math.ceil(width/1.05));
        const ny=Math.max(1,Math.ceil(height/1.05));
        for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
          const u=i/nx,v=j/ny,q=(i+1)/nx,r=(j+1)/ny;
          faces.push(face([corner(u,v),corner(q,v),corner(q,r),corner(u,r)],material,mesh,[[u,v],[q,v],[q,r],[u,r]]));
        }
      }
    }
  } else {
    let g=geometry;
    if(g.type==='SphereGeometry')g=new T.SphereGeometry(1,9,6);
    if(g.type==='CylinderGeometry')g=new T.CylinderGeometry(1,1,1,9);
    const {position,uv}=g.attributes,index=g.index;
    const count=index?.count??position.count;
    for(let i=0;i<count;i+=3) {
      const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
      const vertices=ids.map(k=>new T.Vector3().fromBufferAttribute(position,k).applyMatrix4(matrixWorld));
      const mapUV=uv?ids.map(k=>[uv.getX(k),uv.getY(k)]):null;
      const item=face(vertices,material,mesh,mapUV);
      if(item.n.lengthSq()>.1)faces.push(item);
    }
    if(g!==geometry)g.dispose();
  }
  return faces;
}
function lighting(item) {
  if(item.material.isMeshBasicMaterial)return [1,1,1];
  const y=item.n.y;
  const values=[.31+Math.max(0,y)*.10,.25+Math.max(0,y)*.08,.23+Math.max(0,y)*.07];
  for(const light of lights){
    direction.set(light.x,light.y,light.z).sub(item.center);
    const distanceSq=direction.lengthSq();
    const strength=(.13+.87*Math.max(0,item.n.dot(direction.normalize())))*light.power/(.50+distanceSq*.57);
    values[0]+=light.r*strength;
    values[1]+=light.g*strength;
    values[2]+=light.b*strength;
  }
  return values;
}

function trace(ctx,screen) {
  ctx.beginPath();
  ctx.moveTo(screen[0][0],screen[0][1]);
  for(let i=1;i<screen.length;i++)ctx.lineTo(screen[i][0],screen[i][1]);
  ctx.closePath();
}
function mapped(ctx,screen,texture,image) {
  const uvs=screen.map(p=>[p[2]*texture.repeat.x*image.width,p[3]*texture.repeat.y*image.height]);
  const [a,b,c]=uvs;
  const x1=b[0]-a[0],y1=b[1]-a[1],x2=c[0]-a[0],y2=c[1]-a[1];
  const determinant=x1*y2-y1*x2;
  if(Math.abs(determinant)<.0001)return false;
  const dx1=screen[1][0]-screen[0][0],dy1=screen[1][1]-screen[0][1];
  const dx2=screen[2][0]-screen[0][0],dy2=screen[2][1]-screen[0][1];
  const ax=(dx1*y2-dx2*y1)/determinant,bx=(dy1*y2-dy2*y1)/determinant;
  const ay=(x1*dx2-x2*dx1)/determinant,by=(x1*dy2-x2*dy1)/determinant;
  ctx.save();
  trace(ctx,screen);
  ctx.clip();
  ctx.transform(ax,bx,ay,by,screen[0][0]-ax*a[0]-ay*a[1],screen[0][1]-bx*a[0]-by*a[1]);
  ctx.fillStyle=ctx.createPattern(image,'repeat');
  const loX=Math.min(...uvs.map(p=>p[0])),loY=Math.min(...uvs.map(p=>p[1]));
  const hiX=Math.max(...uvs.map(p=>p[0])),hiY=Math.max(...uvs.map(p=>p[1]));
  ctx.fillRect(loX-2,loY-2,hiX-loX+4,hiY-loY+4);
  ctx.restore();
  return true;
}

export function createSoftwareRenderer(canvas) {
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvas 2D is unavailable.');
  let faces;
  let lastFrame=0;
  const rainyWindow = [new T.Vector3(2.43,1.07,-4.35),new T.Vector3(4.01,1.07,-4.35),new T.Vector3(4.01,2.50,-4.35),new T.Vector3(2.43,2.50,-4.35)];
  return {
    isSoftware:true,
    shadowMap:{},
    capabilities:{getMaxAnisotropy:()=>1},
    setPixelRatio(){},
    setSize(w,h) {
      const scale=Math.min(1,980/w,660/h);
      canvas.width=Math.round(w*scale);
      canvas.height=Math.round(h*scale);
      lastFrame=0;
    },
    render(scene,camera){
      const now=performance.now();
      if(now-lastFrame<29 && lastFrame!==0)return;
      lastFrame=now;
      camera.updateMatrixWorld();
      if(!faces){
        scene.updateMatrixWorld(true);
        faces=[];
        scene.traverse(mesh=>{
          if(mesh.isMesh && !mesh.material.transparent ){
            for(const item of buildMesh(mesh)){
              item.light=lighting(item);
              item.color=tint(item.material,item.light);
              faces.push(item);
            }
          }
        });
      }
      matrix.copy(camera.matrixWorldInverse);
      const w=canvas.width,h=canvas.height,f=h*.5/Math.tan(T.MathUtils.degToRad(camera.fov*.5));
      const render=[];
      const cameraPosition=camera.position;
      const drawDistance=cameraPosition.y>2.35?camera.far:back;
      ctx.fillStyle='#171923';
      ctx.fillRect(0,0,w,h);
      for(const item of faces){
        if(!item.mesh.visible)continue;
        midpoint.copy(item.center).applyMatrix4(matrix);
        if(midpoint.z>1.85||midpoint.z<-drawDistance||Math.abs(midpoint.x)>-midpoint.z*camera.aspect*.77+1.9||Math.abs(midpoint.y)>-midpoint.z*.76+1.9)continue;
        if(item.material.side!==T.DoubleSide && direction.subVectors(cameraPosition,item.center).dot(item.n)<0)continue;
        let vertices=item.vertices.map((p,i)=>{
          work.copy(p).applyMatrix4(matrix);
          return [work.x,work.y,-work.z,item.uv?.[i]?.[0]??0,item.uv?.[i]?.[1]??0];
        });
        if(vertices.some(p=>p[2]<near))vertices=clip(vertices);
        if(vertices.length<3)continue;
        const screen=vertices.map(([x,y,z,u,v])=>[w*.5+x/z*f,h*.5-y/z*f,u,v]);
        if(screen.every(p=>p[0]<0)||screen.every(p=>p[0]>w)||screen.every(p=>p[1]<0)||screen.every(p=>p[1]>h))continue;
        const area=screen.reduce((sum,p,i)=>{const q=screen[(i+1)%screen.length];return sum+p[0]*q[1]-p[1]*q[0];},0);
        if(Math.abs(area)<.27)continue;
        render.push({item,screen,depth:vertices.reduce((sum,p)=>sum+p[2],0)/vertices.length});
      }
      render.sort((a,b)=>b.depth-a.depth);
      for(const {item,screen} of render){
        const tex=item.material.map;
        const image=tex?.image;
        const useTexture=item.uv && image?.width && item.mesh.geometry.type==='BoxGeometry';
        if(useTexture) {
          const light=item.light;
          for(let i=1;i<screen.length-1;i++){
            const triangle=[screen[0],screen[i],screen[i+1]];
            mapped(ctx,triangle,tex,image);
          }
          trace(ctx,screen);
          ctx.fillStyle=item.color;
          ctx.globalAlpha=.49;
          ctx.fill();
          ctx.globalAlpha=.60;
          ctx.globalCompositeOperation='multiply';
          ctx.fillStyle=`rgb(${Math.min(255,105+light[0]*110)},${Math.min(255,83+light[1]*112)},${Math.min(255,79+light[2]*116)})`;
          ctx.fill();
          ctx.globalCompositeOperation='source-over';
          ctx.globalAlpha=1;
        } else {
          trace(ctx,screen);
          ctx.fillStyle=item.color;
          ctx.fill();
          ctx.strokeStyle=item.color;
          ctx.lineWidth=.39;
          ctx.stroke();
        }
      }
      if(cameraPosition.z>-4.22 && cameraPosition.y<3){
        const aperture=rainyWindow.map(p=>{
          work.copy(p).applyMatrix4(matrix);
          return [w*.5-work.x/work.z*f,h*.5+work.y/work.z*f,-work.z];
        });
        if(aperture.every(p=>p[2]>.15) && aperture.some(p=>p[0]>0 && p[0]<w && p[1]>0 && p[1]<h)){
          ctx.save();
          trace(ctx,aperture);
          ctx.clip();
          ctx.strokeStyle='#aac7ee60';
          ctx.lineWidth=.7;
          ctx.beginPath();
          for(let i=0;i<52;i++){
            const x=2.49+((i*71)%150)/100;
            const y=1.11+(((i*53)%137)/100-now*(.0008+(i%4)*.00022))%1.36;
            work.set(x,y<1.10?y+1.36:y,-4.34).applyMatrix4(matrix);
            const dx=w*.5-work.x/work.z*f,dy=h*.5+work.y/work.z*f;
            ctx.moveTo(dx,dy);
            ctx.lineTo(dx-1.5,dy+Math.min(8,f/(-work.z)*.07));
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  };
}
