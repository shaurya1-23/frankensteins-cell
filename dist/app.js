import {walkingPath} from './walk-route.js';

const stops = [
  {id:1, title:'Staircase', page:53, quote:'separated from all the other apartments by a gallery and staircase', note:'The staircase and narrow gallery separate the workshop from the rest of the house. Anyone coming up would have to go out of their way, so Victor can work for months without being seen.', eye:[-6.57,1.63,2.88], target:[-9.42,.61,2.04]},
  {id:2, title:'Workshop door', page:53, quote:'a solitary chamber, or rather cell', note:'The heavy door marks the entrance to Victor’s top-floor room. He calls the room a “cell,” which makes his months of working alone sound like confinement he chose.', eye:[-7.84,1.64,2.81], target:[-4.59,1.45,2.06]},
  {id:3, title:'Worktable', page:53, quote:'I collected bones from charnel-houses', note:'Bones lie on the worktable beside bottles and an open book. Victor says he got bones from charnel-houses, places where human remains were kept. The detail makes the workshop feel closer to a grave than a classroom.', eye:[-1.55,1.70,-1.94], target:[-1.18,1.06,-3.47]},
  {id:4, title:'Window and candle', page:56, quote:'rain pattered dismally against the panes', note:'Rain hits the window, and a short candle is almost out. At one in the morning, there’s just enough light for Victor to see the Creature’s eye open.', eye:[2.45,1.62,-2.39], target:[3.24,1.52,-4.26]},
  {id:5, title:'Instruments', page:56, quote:'I collected the instruments of life around me', note:'Metal tools and small containers sit on the floor around the body. Shelley calls them “instruments of life” and leaves their workings unexplained, which makes the moment the body moves stranger.', eye:[-.64,1.49,2.21], target:[.75,.08,.83]},
  {id:6, title:'The Creature', page:56, quote:'I saw the dull yellow eye of the creature open', note:'The Creature lies on the floor near Victor’s tools. Its yellow eye is the first sign of life Victor describes. He’s spent nearly two years on the work, but the moment it succeeds, he recoils and leaves.', eye:[3.83,1.60,2.37], target:[1.61,.13,.55]},
  {id:7, title:'Bedchamber', page:57, quote:'He held up the curtain of the bed', note:'The bed has curtains, and moonlight comes through the shutters. Victor goes there to get away from the Creature, then wakes to find it lifting the bed curtain.', eye:[-6.64,1.60,-1.15], target:[-8.63,.96,-3.28]}
];
const courtyard = {title:'Courtyard', page:57, quote:'I took refuge in the courtyard', note:'Victor rushes downstairs and paces in the courtyard, afraid the Creature will follow. At dawn, the porter opens the gate and Victor heads into the street (p. 58).'};
const get = id => document.getElementById(id);
const root = get('experience');
const canvas = get('view');
const dialog = get('evidence-dialog');
const note = get('stop-note');
const overview = get('overview');
const keyButton = get('key-button');
const viewTools = get('view-tools');
const lookHint = get('look-hint');
const viewCut = get('view-cut');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const number = id => String(id).padStart(2,'0');
const stopNodes = new Map();
let room, V, Euler, Quaternion, selected, previousTime, travel, lastDialogFocus;
let cameraSpace = 'overhead';
let yaw = 0, pitch = 0;
const pointers = new Map();
const defaultView = {x:-2.59,z:0,azimuth:0,tilt:0,zoom:1};
const view = {...defaultView};
const clamp = (value, low, high) => Math.min(high,Math.max(low,value));
const lerp = (a,b,t) => a+(b-a)*t;
const entry = {
  workshop:{eye:[-8.52,1.63,2.64],target:[-5.37,1.55,2.45]},
  bedroom:{eye:[-6.59,1.63,-.62],target:[-8.63,1.07,-3.28]}
};
function smooth(t) {
  t=clamp(t,0,1);
  return t*t*(3-2*t);
}

function updateSelection() {
  overview.setAttribute('aria-pressed',String(!selected));
  for (const [id, {button, marker}] of stopNodes) {
    const active = String(selected?.id===id);
    button.setAttribute('aria-pressed',active);
    marker.setAttribute('aria-pressed',active);
  }
}
function quoteMarkup(entry) {
  return `“${entry.quote}” <cite>p. ${entry.page}</cite>`;
}
function showNote(stop) {
  note.hidden=!stop;
  if(!stop)return;
  get('note-number').textContent=number(stop.id);
  get('note-title').textContent=stop.title;
  get('note-quote').innerHTML=quoteMarkup(stop);
  get('note-text').textContent=stop.note;
}
function cameraPose(stop) {
  const aspect = room.camera.aspect;
  const fov = stop ? (aspect<.85 ? 72 : 60) : 44;
  let position, horizontal, vertical;
  if(stop){
    position = new V(...stop.eye);
    const direction = new V(...stop.target).sub(position).normalize();
    horizontal = Math.atan2(-direction.x,-direction.z);
    vertical = Math.asin(direction.y);
  }else{
    const span = Math.max(11.8,18.7/aspect);
    const distance = (span*.5/Math.tan(fov*Math.PI/360)+2.7)*view.zoom;
    const offset = distance*Math.sin(view.tilt);
    position = new V(view.x+Math.sin(view.azimuth)*offset,distance*Math.cos(view.tilt),view.z+Math.cos(view.azimuth)*offset);
    horizontal = view.azimuth;
    vertical = -Math.PI/2+view.tilt;
  }
  const rotation = new Quaternion().setFromEuler(new Euler(vertical,horizontal,0,'YXZ'));
  return {position,rotation,fov,yaw:horizontal,pitch:vertical};
}
function applyPose(pose) {
  const {camera}=room;
  camera.position.copy(pose.position);
  camera.quaternion.copy(pose.rotation);
  camera.fov=pose.fov;
  camera.far=Math.max(58,camera.position.y+35);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
function placeCamera(pose, space) {
  cameraSpace=space;
  room.setOverhead(space==='overhead');
  applyPose(pose);
}
function arrive() {
  travel=null;
  viewCut.style.opacity='0';
  const pose=cameraPose(selected);
  placeCamera(pose,destinationSpace(selected));
  yaw=pose.yaw;
  pitch=pose.pitch;
  showNote(selected);
  drawMarkers();
}
function destinationSpace(stop) {
  if(!stop)return 'overhead';
  return stop.id===7?'bedroom':'workshop';
}
function beginStep(time) {
  const next=travel.steps.shift();
  if(!next){
    arrive();
    return;
  }
  const {camera}=room;
  const startRotation=camera.quaternion.clone();
  const path=next.kind==='walk'?walkingPath(camera.position.clone(),next.pose.position,cameraSpace):null;
  const distance=path?.getLength()??0;
  travel.step={...next,startRotation,path,distance,began:time,switched:false,
    duration:path?clamp(520+distance*600,850,7600):450};
}
function visit(id, animate=true) {
  if(!room)return;
  const next=stops.find(stop=>stop.id===id);
  if(next && selected===next){
    if(!travel)showNote(next);
    return;
  }
  if(!next && !selected && animate)Object.assign(view,defaultView);
  selected=next;
  showNote();
  pointers.clear();
  root.classList.toggle('close-up',!!next);
  viewTools.hidden=!!next;
  lookHint.textContent=next?'Drag to look around':(matchMedia('(pointer: coarse)').matches?'Drag to pan · Pinch to zoom':'Drag to pan · Scroll to zoom · Shift-drag to orbit');
  updateSelection();
  if(!animate || reducedMotion.matches || (!next && cameraSpace==='overhead')){
    arrive();
    return;
  }

  const space=destinationSpace(next);
  const steps=[];
  if(!next){
    steps.push({kind:'cut',pose:cameraPose(),space});
  }else{
    if(space!==cameraSpace){
      if(cameraSpace!=='overhead'){
        steps.push({kind:'walk',pose:cameraPose(entry[cameraSpace]),space:cameraSpace});
      }
      // The bedchamber is a separate inset. The intervening passage has no modeled floor.
      steps.push({kind:'cut',pose:cameraPose(entry[space]),space});
    }
    steps.push({kind:'walk',pose:cameraPose(next),space});
  }
  travel={steps,step:null};
  viewCut.style.opacity='0';
  drawMarkers();
}
function advanceTravel(time) {
  if(!travel)return;
  if(!travel.step)beginStep(time);
  if(!travel)return;

  const step=travel.step;
  const progress=clamp((time-step.began)/step.duration,0,1);
  if(!step.path){
    const shade=progress<.5?smooth(progress*2):smooth((1-progress)*2);
    viewCut.style.opacity=String(shade);
    if(progress>=.5 && !step.switched){
      placeCamera(step.pose,step.space);
      step.switched=true;
    }
  }else{
    const ramp=.16;
    const fraction=progress<ramp
      ? progress*progress/(2*ramp*(1-ramp))
      : progress>1-ramp
        ? 1-(1-progress)*(1-progress)/(2*ramp*(1-ramp))
        : (progress-ramp*.5)/(1-ramp);
    const position=step.path.getPoint(fraction);
    const lookAhead=step.path.getPoint(Math.min(1,fraction+.44/Math.max(.44,step.distance)));
    const lookBack=step.path.getPoint(Math.max(0,fraction-.22/Math.max(.22,step.distance)));
    const heading=lookAhead.sub(lookBack);
    const headingYaw=Math.atan2(-heading.x,-heading.z);
    const walkingRotation=new Quaternion().setFromEuler(new Euler(-.045,headingYaw,0,'YXZ'));
    const elapsed=progress*step.duration;
    const rotation=step.startRotation.clone()
      .slerp(walkingRotation,smooth(elapsed/520))
      .slerp(step.pose.rotation,smooth((elapsed-step.duration+700)/700));
    const stride=fraction*step.distance/.69;
    position.y+=Math.sin(stride*Math.PI*2)*.022*smooth(progress/.13)*smooth((1-progress)/.16);
    applyPose({position,rotation,fov:step.pose.fov});
  }
  if(progress>=1){
    placeCamera(step.pose,step.space);
    viewCut.style.opacity='0';
    beginStep(time);
  }
}
function updateOverhead() {
  applyPose(cameraPose());
  drawMarkers();
}
function zoom(factor) {
  if(!room || selected || travel || dialog.open)return;
  view.zoom=clamp(view.zoom*factor,.40,1.60);
  updateOverhead();
}
function pan(dx,dy) {
  const camera=room.camera;
  const scale=2*camera.position.y*Math.tan(camera.fov*Math.PI/360)/root.clientHeight;
  const sine=Math.sin(view.azimuth),cosine=Math.cos(view.azimuth);
  view.x=clamp(view.x-(cosine*dx+sine*dy)*scale,-12,7);
  view.z=clamp(view.z-(-sine*dx+cosine*dy)*scale,-7,7);
  updateOverhead();
}
function drawMarkers() {
  if(!room)return;
  const {camera,markers}=room;
  const width=root.clientWidth, height=root.clientHeight;
  for(const stop of markers){
    const marker=stopNodes.get(stop.id).marker;
    if(selected || travel || dialog.open){marker.hidden=true;continue;}
    const point=stop.projection.copy(stop.position).project(camera);
    marker.hidden=point.z < -1 || point.z > 1 || Math.abs(point.x)>.98 || Math.abs(point.y)>.95;
    if(!marker.hidden)marker.style.transform=`translate(${(point.x*.5+.5)*width}px,${(.5-point.y*.5)*height}px) translate(-50%,-100%)`;
  }
}

function openKey() {
  lastDialogFocus=document.activeElement;
  pointers.clear();
  dialog.showModal();
  drawMarkers();
  get('close-dialog').focus();
}
keyButton.addEventListener('click',openKey);
get('fallback-key').addEventListener('click',openKey);
get('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{
  if(lastDialogFocus?.isConnected)lastDialogFocus.focus();
  lastDialogFocus=null;
  drawMarkers();
});
overview.title='Return to or reset the overhead view';
overview.addEventListener('click',()=>visit());
get('zoom-in').addEventListener('click',()=>zoom(.83));
get('zoom-out').addEventListener('click',()=>zoom(1.20));
get('rotate-view').addEventListener('click',()=>{
  if(!room || selected || travel)return;
  view.azimuth-=Math.PI/2;
  updateOverhead();
});
get('close-note').addEventListener('click',()=>{
  showNote();
  stopNodes.get(selected?.id)?.button.focus();
});
for (const stop of stops) {
  const button=document.createElement('button');
  button.type='button';
  button.textContent=number(stop.id);
  button.title=stop.title;
  button.setAttribute('aria-label',`${number(stop.id)} ${stop.title}`);
  button.addEventListener('click',()=>visit(stop.id));
  get('stop-buttons').append(button);

  const marker=document.createElement('button');
  marker.type='button';
  marker.className='marker';
  marker.hidden=true;
  marker.title=stop.title;
  marker.setAttribute('aria-label',`Go to ${stop.title}`);
  marker.innerHTML=`<span class="number">${number(stop.id)}</span><span class="triangle" aria-hidden="true"></span>`;
  marker.addEventListener('click',()=>{
    visit(stop.id);
    button.focus({preventScroll:true});
  });
  get('markers').append(marker);
  stopNodes.set(stop.id,{button,marker});
}
updateSelection();

const mapList=document.createElement('ol');
mapList.className='map-stops';
for(const stop of stops){
  const item=document.createElement('li');
  const go=document.createElement('button');
  go.type='button';
  go.innerHTML=`<span class="index">${number(stop.id)}</span><span>${stop.title}</span><span aria-hidden="true">↗</span>`;
  go.addEventListener('click',()=>{
    lastDialogFocus=stopNodes.get(stop.id).button;
    dialog.close();
    visit(stop.id);
  });
  const quote=document.createElement('blockquote');
  quote.innerHTML=quoteMarkup(stop);
  const description=document.createElement('p');
  description.textContent=stop.note;
  item.append(go,quote,description);
  mapList.append(item);
}
const extra=document.createElement('section');
extra.className='map-extra';
extra.innerHTML=`<h3>${courtyard.title}</h3><blockquote>${quoteMarkup(courtyard)}</blockquote><p>${courtyard.note}</p>`;
get('dialog-body').append(mapList,extra);

canvas.addEventListener('contextmenu',event=>{
  if(!selected)event.preventDefault();
});
canvas.addEventListener('pointerdown',event=>{
  if(!room || travel || dialog.open || (event.button!==0 && (selected || event.button!==2)))return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,orbit:event.button===2});
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  const pointer=pointers.get(event.pointerId);
  if(!pointer || !room || travel)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
  const other=[...pointers].find(([id])=>id!==event.pointerId)?.[1];
  if(!selected && other){
    const before=Math.hypot(pointer.x-other.x,pointer.y-other.y);
    const after=Math.hypot(event.clientX-other.x,event.clientY-other.y);
    if(after>12 && before>12)zoom(before/after);
  } else if(selected){
    yaw-=dx*.0035;
    pitch=clamp(pitch-dy*.0035,-1.4,1.4);
    room.camera.rotation.set(pitch,yaw,0,'YXZ');
  } else if(pointer.orbit || event.shiftKey){
    view.azimuth-=dx*.006;
    view.tilt=clamp(view.tilt+dy*.004,0,.46);
    updateOverhead();
  }else{
    pan(dx,dy);
  }
  pointer.x=event.clientX;
  pointer.y=event.clientY;
});
for(const type of ['pointerup','pointercancel','lostpointercapture']){
  canvas.addEventListener(type,event=>pointers.delete(event.pointerId));
}
canvas.addEventListener('wheel',event=>{
  if(!room || selected || travel || dialog.open)return;
  event.preventDefault();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?root.clientHeight:1);
  zoom(Math.exp(clamp(delta,-270,270)*.0015));
},{passive:false});
window.addEventListener('keydown',event=>{
  if(event.altKey || event.ctrlKey || event.metaKey || event.repeat)return;
  if(event.code==='KeyM'){
    event.preventDefault();
    if(dialog.open)dialog.close();else openKey();
  } else if(!dialog.open && event.code==='Escape'){
    if(!note.hidden){
      showNote();
      stopNodes.get(selected?.id)?.button.focus();
    }else if(selected){
      visit();
      overview.focus();
    }
  }
});

function resize() {
  room.renderer.setSize(root.clientWidth,root.clientHeight,false);
  const camera=room.camera;
  camera.aspect=root.clientWidth/root.clientHeight;
  if(travel){
    if(travel.step?.space==='overhead')travel.step.pose=cameraPose();
    camera.updateProjectionMatrix();
  }else if(selected){
    camera.fov=cameraPose(selected).fov;
    camera.updateProjectionMatrix();
  }else{
    updateOverhead();
  }
}
function draw(time) {
  if(!room)return;
  const dt=Math.min(.08,(time-(previousTime??time))/1000);
  previousTime=time;
  if(!dialog.open){
    advanceTravel(time);
    room.animate(time/1000,dt);
    room.renderer.render(room.scene,room.camera);
  }
  requestAnimationFrame(draw);
}
function showFailure() {
  room=null;
  get('failure').hidden=false;
  get('navigation').hidden=true;
  lookHint.hidden=true;
  viewTools.hidden=true;
  get('markers').hidden=true;
  showNote();
  for(const button of mapList.querySelectorAll('button')){
    button.disabled=true;
    button.querySelector('[aria-hidden=true]').hidden=true;
  }
}
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();
  showFailure();
});
try {
  const [{createWorkshop},{Vector3,Euler:Rotation,Quaternion:Orientation}]=await Promise.all([import('./room.js'),import('./assets/three.module.js')]);
  V=Vector3;
  Euler=Rotation;
  Quaternion=Orientation;
  room=createWorkshop(canvas);
  for(const stop of room.markers){
    stop.position=new V(stop.x,stop.y,stop.z);
    stop.projection=new V();
  }
  resize();
  visit(undefined,false);
  window.addEventListener('resize',resize);
  requestAnimationFrame(draw);
} catch(error) {
  console.error('Could not start the workshop.',error);
  showFailure();
}
