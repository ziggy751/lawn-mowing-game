import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seeded } from './lawn';
const mat=(color:string,roughness=.85,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const cream=mat('#dfd7c3'), trim=mat('#f4f0e4'), roof=mat('#53605c'), wood=mat('#aca18b'), dark=mat('#273b37'), glass=new T.MeshStandardMaterial({color:'#719699',metalness:.45,roughness:.2});
export function box(parent:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export function cylinder(parent:T.Object3D,r:number,h:number,x:number,y:number,z:number,m:T.Material,r2=r){const o=new T.Mesh(new T.CylinderGeometry(r2,r,h,12),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
export function tube(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,m:T.Material){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,a.distanceTo(b),8),m);mesh.position.copy(a).lerp(b,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());parent.add(mesh);return mesh;}
function texture(kind:'brick'|'gravel'|'wood'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const c=canvas.getContext('2d')!;const random=seeded(222);
 c.fillStyle=kind==='brick'?'#beb49e':kind==='gravel'?'#b9b4a8':'#9e9784';c.fillRect(0,0,512,512);
 for(let i=0;i<14000;i++){const a=random()*.14;c.fillStyle=`rgba(${random()>.5?'255,255,255':'0,0,0'},${a})`;c.fillRect(random()*512,random()*512,random()*3+1,random()*3+1);}
 if(kind==='brick')for(let row=0;row<16;row++)for(let col=-1;col<5;col++){c.strokeStyle='#dfd8c7';c.lineWidth=3;c.strokeRect(col*128+(row%2)*64,row*32,128,32);}
 if(kind==='wood')for(let i=0;i<12;i++){c.strokeStyle='#756e60';c.lineWidth=2;c.beginPath();c.moveTo(i*44,0);c.lineTo(i*44,512);c.stroke();}
 const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;return tex;
}
function house(parent:T.Object3D,x:number,z:number,scale=1){
 const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
 const brick=texture('brick');brick.repeat.set(3,1.4);const wall=new T.MeshStandardMaterial({map:brick,roughness:1});
 box(g,13,3.8,7,0,1.9,0,wall);
 // A true pitched roof with corrugated seam lines and deep eaves.
 const roofGeo=new T.BufferGeometry();roofGeo.setAttribute('position',new T.Float32BufferAttribute([-7.1,3.8,-4,-7.1,3.8,4,-7.1,5.7,0,7.1,3.8,-4,7.1,3.8,4,7.1,5.7,0],3));roofGeo.setIndex([0,2,1,3,4,5,0,5,3,0,2,5,1,5,2,1,4,5]);roofGeo.computeVertexNormals();const r=new T.Mesh(roofGeo,roof);r.castShadow=true;g.add(r);
 for(let x=-7;x<=7;x+=.24){tube(g,new T.Vector3(x,3.81,4),new T.Vector3(x,5.71,0),.012,dark);tube(g,new T.Vector3(x,5.71,0),new T.Vector3(x,3.81,-4),.012,dark);}
 for(const wx of [-4.6,-1.6,3.5]){box(g,2.05,1.65,.12,wx,2.05,3.55,trim);box(g,1.83,1.43,.14,wx,2.05,3.63,glass);box(g,.06,1.5,.17,wx,2.05,3.72,trim);box(g,1.9,.06,.17,wx,2.05,3.72,trim);box(g,2.25,.12,.35,wx,1.2,3.65,trim);}
 box(g,1.35,2.65,.2,.85,1.325,3.6,dark);box(g,.8,1.4,.04,.85,1.8,3.72,glass);cylinder(g,.035,.12,1.3,1.25,3.79,mat('#bda368',.3,.6)).rotation.x=Math.PI/2;
 box(g,7.6,.2,2,-.8,.15,4.3,mat('#bdb7aa'));box(g,8,.16,2.2,-.8,3.4,4.4,roof);
 for(const px of [-4.5,2.9])box(g,.13,3.4,.13,px,1.7,5.3,trim);
 box(g,2.7,.13,.65,-2.4,.9,4.5,wood);for(const px of [-3.4,-1.4])box(g,.12,.8,.5,px,.45,4.5,dark);
 for(const p of [[-5.8,4.3],[4.7,4.2]]){cylinder(g,.35,.6,p[0],.3,p[1],mat('#a76b4d'),.43);shrub(g,p[0],.95,p[1],.65);}
 box(g,.15,3.7,.15,6.2,1.85,3.7,trim);
}
function shrub(g:T.Object3D,x:number,y:number,z:number,s:number){const random=seeded(Math.abs(x*133+z*444)|0);for(let i=0;i<7;i++){const m=new T.Mesh(new T.IcosahedronGeometry(s*(.4+random()*.4),1),mat(i%2?'#526641':'#677a49'));m.position.set(x+(random()-.5)*s,y+(random()-.5)*s*.5,z+(random()-.5)*s);m.castShadow=true;g.add(m);}}
function tree(g:T.Object3D,x:number,z:number,s=1){const bark=mat('#75644d');cylinder(g,.16*s,3*s,x,1.5*s,z,bark,.09*s);const random=seeded((x+70)*49);for(let i=0;i<7;i++){const a=i*2.4,dx=Math.cos(a)*.9*s,dz=Math.sin(a)*.9*s;tube(g,new T.Vector3(x,2*s,z),new T.Vector3(x+dx,3.6*s,z+dz),.055*s,bark);for(let leaf=0;leaf<17;leaf++){
 const crown=new T.Mesh(new T.IcosahedronGeometry((.28+random()*.32)*s,1),mat(['#526d3d','#687c45','#3e6038','#7f8b4b'][leaf%4]));
 const az=random()*Math.PI*2,rad=Math.sqrt(random())*1.1*s;
 crown.position.set(x+dx+Math.cos(az)*rad,3.6*s+random()*1.1*s,z+dz+Math.sin(az)*rad);crown.scale.set(1,.65+random()*.5,1);crown.castShadow=true;g.add(crown);
 }}}
export function buildWorld(scene:T.Scene){
 scene.background=new T.Color('#c4d2cb');scene.fog=new T.Fog('#c4d2cb',35,110);
 const hemi=new T.HemisphereLight('#edf5e5','#656b43',2.1);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff0cd',3.3);sun.position.set(-14,23,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,far:80});sun.shadow.bias=-.0004;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
 box(scene,230,.1,230,0,-.14,0,mat('#7c8760'));
 const lawn=new T.Mesh(new T.PlaneGeometry(20,18,40,36),mat('#465c24'));lawn.rotation.x=-Math.PI/2;lawn.position.set(0,.005,2);lawn.receiveShadow=true;scene.add(lawn);
 const gravel=texture('gravel');gravel.repeat.set(5,18);const paving=new T.MeshStandardMaterial({map:gravel,roughness:1});
 box(scene,3,.12,27,12,.02,-1,paving);box(scene,29,.14,1.6,0,.02,12.3,paving);
 for(let z=-12;z<12;z+=2)box(scene,3,.008,.025,12,.086,z,mat('#999589'));
 box(scene,230,.12,7,0,-.04,18,mat('#686d69'));box(scene,230,.18,.2,0,.06,14.5,mat('#b7b7a9'));
 for(let x=-100;x<100;x+=6)box(scene,2,.008,.07,x,.025,18,mat('#e1ddc3'));
 house(scene,0,-12.8);
 // Slatted boundary fence, posts and capping, with individual timber boards.
 for(const side of [-1,1]){for(let z=-17;z<11;z+=.19)box(scene,.12,1.65,.17,side*14, .825,z,wood);for(let z=-17;z<12;z+=2.4)box(scene,.23,1.86,.23,side*14,.93,z,cream);box(scene,.2,.1,28,side*14,1.7,-3,wood);}
 for(let x=-14;x<14;x+=.19)box(scene,.17,1.65,.12,x,.825,-17,wood);
 // Garden beds, clipped hedges and native planting.
 for(const side of [-1,1]){
  box(scene,.85,.18,17,side*10.65,.08,1,mat('#7b6c52'));box(scene,.1,.25,18,side*10.2,.12,2,mat('#c3b8a2'));
  for(let z=-6;z<10;z+=.9){shrub(scene,side*10.7,.4,z,.65);if(z%2<1){for(let i=0;i<4;i++){const flower=new T.Mesh(new T.SphereGeometry(.045,5,4),mat('#d2c0d9'));flower.position.set(side*10.7+(i-.5)*.08,.8,z);scene.add(flower);}}}
 }
 tree(scene,-12,4,1.25);tree(scene,12,-9,1.1);tree(scene,-11,-11,1.05);
 // Driveway garage and a small garden shed.
 box(scene,4.5,2.9,5,12,1.45,-13,cream);box(scene,4.8,.15,5.3,12,2.95,-13,roof);box(scene,3.6,2.3,.1,12,1.2,-10.45,mat('#737f77'));for(let y=.3;y<2.4;y+=.22)box(scene,3.55,.025,.05,12,y,-10.36,dark);
 cylinder(scene,.06,1.2,10.8,.6,10.7,dark);box(scene,.55,.4,.4,10.8,1.3,10.7,dark);box(scene,.4,.025,.02,10.8,1.3,10.92,trim);
 // Neighbourhood beyond the street and side boundaries.
 house(scene,-29,-9,.95);house(scene,30,-12,1);house(scene,6,36,1);house(scene,-21,37,.9);
 for(const [x,z] of [[-27,9],[25,11],[-20,29],[21,30],[-38,-22],[35,-24]])tree(scene,x,z,1.4);
 // Bake static architecture into material batches, keeping geometry detail without per-board draw calls.
 scene.updateMatrixWorld(true);
 const batches=new Map<string,{material:T.MeshStandardMaterial;geos:T.BufferGeometry[]}>();
 const originals:T.Mesh[]=[];
 scene.traverse(o=>{if(!(o instanceof T.Mesh)||!(o.material instanceof T.MeshStandardMaterial))return;
  const m=o.material,key=[m.color.getHexString(),m.roughness,m.metalness,m.map?.uuid??''].join(':');
  const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(!geo.getAttribute('uv'))geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));
  let batch=batches.get(key);if(!batch){batch={material:m,geos:[]};batches.set(key,batch);}batch.geos.push(geo);originals.push(o);
 });
 for(const o of originals){o.removeFromParent();o.geometry.dispose();}
 for(const batch of batches.values()){const merged=mergeGeometries(batch.geos,false);if(merged){const mesh=new T.Mesh(merged,batch.material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);}for(const g of batch.geos)g.dispose();}
 return {sun,hemi};
}
export function makeMower(color='#d5a33f'){
 const g=new T.Group(), body=mat(color,.35,.25), metal=mat('#a1a7a0',.3,.65), black=mat('#222b29',.65), rubber=mat('#282d29'), red=mat('#ba6046');
 const deckShape=new T.Shape();deckShape.moveTo(-.28,-.4);deckShape.lineTo(.28,-.4);deckShape.quadraticCurveTo(.39,-.4,.39,-.28);deckShape.lineTo(.39,.22);deckShape.quadraticCurveTo(.39,.33,.26,.33);deckShape.lineTo(-.26,.33);deckShape.quadraticCurveTo(-.39,.33,-.39,.22);deckShape.lineTo(-.39,-.28);deckShape.quadraticCurveTo(-.39,-.4,-.28,-.4);
 const deck=new T.Mesh(new T.ExtrudeGeometry(deckShape,{depth:.1,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1}),body);deck.rotation.x=-Math.PI/2;deck.position.y=.16;deck.castShadow=true;g.add(deck);
 cylinder(g,.205,.18,0,.34,-.08,black);cylinder(g,.17,.03,0,.445,-.08,metal);
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const v=box(g,.015,.01,.085,Math.sin(a)*.1,.466,-.08+Math.cos(a)*.1,black);v.rotation.y=a;}
 box(g,.17,.13,.17,.19,.4,.05,black);cylinder(g,.035,.035,.19,.485,.05,red);
 box(g,.16,.14,.15,-.2,.31,-.05,metal);for(let i=0;i<6;i++)box(g,.17,.015,.17,-.2,.26+i*.023,-.05,black);
 const wheels:T.Object3D[]=[];
 for(const x of [-.405,.405])for(const z of [-.27,.27]){const w=new T.Group();w.position.set(x,.15,z);const tire=new T.Mesh(new T.CylinderGeometry(.15,.15,.095,24),rubber);tire.rotation.z=Math.PI/2;w.add(tire);const hub=new T.Mesh(new T.CylinderGeometry(.077,.077,.104,16),metal);hub.rotation.z=Math.PI/2;w.add(hub);for(let i=0;i<18;i++){const a=i*Math.PI/9;const tread=box(w,.1,.023,.035,0,Math.cos(a)*.148,Math.sin(a)*.148,black);tread.rotation.x=a;}g.add(w);wheels.push(w);}
 for(const x of [-.29,.29]){tube(g,new T.Vector3(x,.25,.25),new T.Vector3(x,.95,1.05),.025,metal);tube(g,new T.Vector3(x,.95,1.05),new T.Vector3(x,1.02,1.08),.03,black);}
 tube(g,new T.Vector3(-.3,1.02,1.08),new T.Vector3(.3,1.02,1.08),.032,black);tube(g,new T.Vector3(-.27,.97,1.03),new T.Vector3(.27,.97,1.03),.014,red);
 box(g,.44,.32,.42,0,.31,.55,mat('#354238'));box(g,.43,.04,.44,0,.49,.55,black);
 return {group:g,wheels,body};
}
export function makeTrimmer(){
 const group=new T.Group(),body=mat('#c98a46',.4,.2),metal=mat('#9ba99e',.3,.7),black=mat('#27372d');
 tube(group,new T.Vector3(.15,.1,-.35),new T.Vector3(.15,1.1,.95),.025,metal);
 cylinder(group,.2,.035,.15,.09,-.35,black);cylinder(group,.055,.05,.15,.07,-.35,body);
 box(group,.25,.19,.26,.15,1.1,.92,body);box(group,.2,.08,.2,.15,1.23,.92,black);
 tube(group,new T.Vector3(.15,.75,.5),new T.Vector3(-.15,.83,.5),.025,black);tube(group,new T.Vector3(-.15,.83,.5),new T.Vector3(-.15,.91,.65),.025,black);
 return {group,wheels:[] as T.Object3D[],body};
}
