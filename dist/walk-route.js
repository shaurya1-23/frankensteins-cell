import {CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3} from './assets/three.module.js';

// Floor clearance for the modeled doorway, benches, crates, and floor props.
const guides = [
  [-5.60,2.45],[-4.92,2.45],[-.43,1.88],[-.43,-.69],
  [3.48,-.69],[3.48,1.88]
];
const obstacles = [
  [-3.79,3.07,-4.25,-2.63],
  [3.76,5.2,-3.15,-.94],
  [-4.20,-2.04,3.34,4.3],
  [4.04,5.2,3.18,4.3],
  [-.10,3.14,-.37,1.53]
];

function clear(point, space) {
  const {x,z}=point;
  if(space==='bedroom')return x>=-7.17 && x<=-6.19 && z>=-2.67 && z<=-.45;
  if(x< -5.18)return x>=-8.74 && z>=1.40 && z<=3.24;
  return x<=5.17 && z>=-4.13 && z<=4.15
    && !obstacles.some(([left,right,top,bottom])=>x>=left && x<=right && z>=top && z<=bottom);
}

function segmentClear(a,b,space) {
  const samples=Math.max(2,Math.ceil(a.distanceTo(b)/.08));
  const point=new Vector3();
  for(let i=0;i<=samples;i++){
    if(!clear(point.lerpVectors(a,b,i/samples),space))return false;
  }
  return true;
}

export function walkingPath(start,end,space) {
  const path=new CurvePath();
  const nodes=[start,end,...(space==='bedroom'?[]:guides.map(([x,z])=>new Vector3(x,1.62,z)))];
  const distances=nodes.map(()=>Infinity);
  const previous=nodes.map(()=>-1);
  const remaining=new Set(nodes.map((_,index)=>index));
  distances[0]=0;
  while(remaining.size){
    let nearest=-1;
    for(const index of remaining){
      if(nearest===-1 || distances[index]<distances[nearest])nearest=index;
    }
    if(nearest===1 || !Number.isFinite(distances[nearest]))break;
    remaining.delete(nearest);
    for(const index of remaining){
      const nextDistance=distances[nearest]+nodes[nearest].distanceTo(nodes[index]);
      if(nextDistance<distances[index] && segmentClear(nodes[nearest],nodes[index],space)){
        distances[index]=nextDistance;
        previous[index]=nearest;
      }
    }
  }
  if(previous[1]<0)return null;
  const points=[];
  for(let index=1;index!==-1;index=previous[index])points.unshift(nodes[index]);
  let cursor=points[0];
  for(let i=1;i<points.length-1;i++){
    const corner=points[i];
    const distance=Math.min(.38,corner.distanceTo(points[i-1])*.30,corner.distanceTo(points[i+1])*.30);
    const approach=corner.clone().lerp(points[i-1],distance/corner.distanceTo(points[i-1]));
    const departure=corner.clone().lerp(points[i+1],distance/corner.distanceTo(points[i+1]));
    const turn=new QuadraticBezierCurve3(approach,corner,departure);
    if(turn.getPoints(12).every(point=>clear(point,space))){
      path.add(new LineCurve3(cursor,approach));
      path.add(turn);
      cursor=departure;
    } else {
      path.add(new LineCurve3(cursor,corner));
      cursor=corner;
    }
  }
  path.add(new LineCurve3(cursor,end));
  return path;
}
