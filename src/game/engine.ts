import * as T from 'three';
import { Grass } from './grass';
import { Clippings } from './clippings';
import { buildWorld, makeMower, makeTrimmer } from './world';
import { terrain, freshLawn, mowCells, coverage, type Cut } from './lawn';
export type Tool={id:string;name:string;width:number;speed:number;price:number;kind:string;power:string};
export const TOOLS:Tool[]=[{id:'classic',name:'Fieldwork 46',width:.65,speed:2.3,price:0,kind:'Petrol push mower',power:'140 cc'},{id:'electric',name:'Quietcut 56',width:.85,speed:2.7,price:650,kind:'Battery mower',power:'56 V'},{id:'commercial',name:'Groundsman 76',width:1.15,speed:3.1,price:1400,kind:'Commercial walk-behind',power:'190 cc'},{id:'trimmer',name:'Edgecraft 30',width:.42,speed:2.4,price:320,kind:'Line trimmer',power:'30 cc'}];
export class Engine {
 scene=new T.Scene();camera=new T.PerspectiveCamera(48,1,.1,150);renderer:T.WebGLRenderer;
 grass:Grass;clippings:Clippings; mower=makeMower();heights=freshLawn();lights:ReturnType<typeof buildWorld>;
 keys=new Set<string>();active=false;running=false;heading=0;speed=0;elapsed=0;fuel=100;cutHeight=45;tool=TOOLS[0];cameraMode=2;orbit=0;pitch=.63;zoom=9;wind=1;fps=60;
 onCut:(cuts:Cut[])=>void=()=>{};onUpdate:()=>void=()=>{};onPause:()=>void=()=>{};onCamera:()=>void=()=>{};onTool:(n:number)=>void=()=>{}; authoritative=false;
 private accumulator=0;private last=0;private tick=0;private frame=0;private dragging=false;private lastX=0;private lastY=0;private audio?:AudioContext;private oscillator?:OscillatorNode;private gain?:GainNode;
 remotes=new Map<string,{model:ReturnType<typeof makeMower>;target:T.Vector3;heading:number}>();
 constructor(container:HTMLElement){
 this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.04;container.append(this.renderer.domElement);
 this.lights=buildWorld(this.scene);this.grass=new Grass(this.scene);this.clippings=new Clippings(this.scene);this.scene.add(this.mower.group);this.mower.group.position.set(0,0,8);this.camera.position.set(19,17,25);this.camera.lookAt(0,0,-2);
 const resize=()=>{const w=container.clientWidth,h=container.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(container);resize();
 window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();this.keys.add(e.code);if(e.repeat)return;if(e.code==='Escape')this.onPause();if(!this.active)return;if(e.code==='KeyF'||e.code==='KeyE')this.toggleEngine();if(e.code==='KeyC'){this.cameraMode=(this.cameraMode+1)%3;this.onCamera();}if(/^Digit[1-4]$/.test(e.code))this.onTool(Number(e.code.slice(-1))-1);});
 window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.keys.clear());
 const el=this.renderer.domElement;el.addEventListener('pointerdown',e=>{this.dragging=true;this.lastX=e.clientX;this.lastY=e.clientY;el.setPointerCapture(e.pointerId);});el.addEventListener('pointerup',()=>this.dragging=false);el.addEventListener('pointermove',e=>{if(!this.dragging)return;this.orbit-=(e.clientX-this.lastX)*.006;this.pitch=T.MathUtils.clamp(this.pitch+(e.clientY-this.lastY)*.004,.14,1.3);this.lastX=e.clientX;this.lastY=e.clientY;});el.addEventListener('wheel',e=>{e.preventDefault();this.zoom=T.MathUtils.clamp(this.zoom+e.deltaY*.008,3,22);},{passive:false});
 requestAnimationFrame(this.loop);
 }
 toggleEngine(){this.running=!this.running;this.sound();this.onUpdate();}
 sound(){if(!this.audio){this.audio=new AudioContext();this.oscillator=this.audio.createOscillator();this.oscillator.type='sawtooth';this.gain=this.audio.createGain();const filter=this.audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;this.oscillator.connect(filter);filter.connect(this.gain);this.gain.connect(this.audio.destination);this.gain.gain.value=0;this.oscillator.start();}void this.audio.resume();}
 mute=false;
 setTool(tool:Tool){const changeModel=(this.tool.id==='trimmer')!==(tool.id==='trimmer');this.tool=tool;if(changeModel){const old=this.mower;this.mower=tool.id==='trimmer'?makeTrimmer():makeMower();this.mower.group.position.copy(old.group.position);this.mower.group.rotation.copy(old.group.rotation);this.scene.remove(old.group);old.group.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});this.scene.add(this.mower.group);}this.mower.body.color.set(tool.id==='electric'?'#819d76':tool.id==='commercial'?'#cf6848':'#d5a33f');this.mower.group.scale.x=tool.id==='trimmer'?1:tool.width/.65;this.onUpdate();}
 reset(){this.heights=freshLawn();this.grass.reset();this.elapsed=0;this.fuel=100;this.mower.group.position.set(0,0,8);this.heading=0;this.speed=0;this.running=false;this.onUpdate();}
 apply(cuts:Cut[]){for(const [i,h]of cuts)this.heights[i]=h;this.grass.apply(cuts);}
 get progress(){return coverage(this.heights);}
 remote(id:string,x:number,z:number,h:number){let r=this.remotes.get(id);if(!r){const model=makeMower('#92a8a1');this.scene.add(model.group);r={model,target:new T.Vector3(x,0,z),heading:h};r.model.group.position.copy(r.target);this.remotes.set(id,r);}r.target.set(x,terrain(x,z),z);r.heading=h;}
 removeRemote(id:string){const r=this.remotes.get(id);if(r){this.scene.remove(r.model.group);r.model.group.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});this.remotes.delete(id);}}
 private step(dt:number){
 if(!this.active)return;this.elapsed+=dt;
 const f=(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0);
 const turn=(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)-(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0);
 this.speed=T.MathUtils.damp(this.speed,f*this.tool.speed*(this.keys.has('ShiftLeft')?1.2:1),5,dt);this.heading+=turn*1.65*dt;
 const p=this.mower.group.position;p.x=T.MathUtils.clamp(p.x-Math.sin(this.heading)*this.speed*dt,-9.8,9.8);p.z=T.MathUtils.clamp(p.z-Math.cos(this.heading)*this.speed*dt,-6.8,10.8);p.y=terrain(p.x,p.z)+.015+(this.running?Math.sin(this.elapsed*75)*.002:0);this.mower.group.rotation.y=this.heading;
 this.mower.wheels.forEach(w=>w.rotation.x-=this.speed*dt/.15);
 if(this.running&&this.fuel>0){this.fuel=Math.max(0,this.fuel-dt*.024);if(!this.authoritative){const cuts=mowCells(p.x,p.z,this.heading,this.tool.width,this.cutHeight,this.heights);if(cuts.length){this.grass.apply(cuts);this.onCut(cuts);}}}
 }
 private loop=(now:number)=>{const dt=Math.min((now-this.last)/1000||0,.08);this.last=now;this.accumulator+=dt;while(this.accumulator>=1/60){this.step(1/60);this.accumulator-=1/60;}
 const p=this.mower.group.position;
 if(this.active){const a=this.heading+this.orbit;const first=this.cameraMode===0;const distance=first?1.5:this.cameraMode===1?5:this.zoom;
 const target=new T.Vector3(p.x+Math.sin(a)*distance,first?1.55:1.4+Math.sin(this.pitch)*distance,p.z+Math.cos(a)*distance);this.camera.position.lerp(target,1-Math.exp(-dt*5));this.camera.lookAt(p.x,p.y+(first?1.15:.25),p.z);}
 for(const r of this.remotes.values()){r.model.group.position.lerp(r.target,1-Math.exp(-dt*12));r.model.group.rotation.y+=T.MathUtils.euclideanModulo(r.heading-r.model.group.rotation.y+Math.PI,Math.PI*2)-Math.PI;}
 this.clippings.update(dt,p,this.heading,this.active&&this.running&&Math.abs(this.speed)>.15);
 this.grass.update(now/1000,this.camera);this.grass.material.uniforms.uWind.value=this.wind;
 if(this.gain&&this.audio){this.gain.gain.setTargetAtTime(this.active&&this.running&&!this.mute?.025:0,this.audio.currentTime,.1);this.oscillator!.frequency.setTargetAtTime(this.tool.id==='electric'?110:42+Math.abs(this.speed)*7,this.audio.currentTime,.1);}
 this.renderer.render(this.scene,this.camera);this.frame++;this.tick+=dt;if(this.tick>.3){this.fps=Math.round(this.frame/this.tick);this.tick=0;this.frame=0;this.onUpdate();}requestAnimationFrame(this.loop);
 }
 preset='high';
 quality(preset:string){this.preset=preset;const density=({low:.3,medium:.6,high:1,ultra:1} as Record<string,number>)[preset]??1;this.grass.density(density);this.renderer.setPixelRatio(Math.min(devicePixelRatio,preset==='low'?1:preset==='ultra'?2:1.5));this.renderer.shadowMap.enabled=preset!=='low';this.lights.sun.shadow.mapSize.set(preset==='ultra'?4096:2048,preset==='ultra'?4096:2048);this.lights.sun.shadow.map?.dispose();this.lights.sun.shadow.map=null;}
}
