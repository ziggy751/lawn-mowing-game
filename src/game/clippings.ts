import * as T from 'three';
// A fixed particle pool: no geometry or materials allocated during mowing.
export class Clippings{
 mesh:T.InstancedMesh;private positions=new Float32Array(96*3);private velocity=new Float32Array(96*3);private life=new Float32Array(96);private cursor=0;private dummy=new T.Object3D();
 constructor(scene:T.Scene){this.mesh=new T.InstancedMesh(new T.PlaneGeometry(.028,.065),new T.MeshBasicMaterial({color:'#899e48',side:T.DoubleSide}),96);this.mesh.frustumCulled=false;for(let i=0;i<96;i++){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);}scene.add(this.mesh);}
 update(dt:number,p:T.Vector3,heading:number,emit:boolean){
 if(emit)for(let n=0;n<2;n++){const i=this.cursor++%96;this.life[i]=.4+Math.random()*.4;this.positions.set([p.x+.25*Math.cos(heading),p.y+.2,p.z-.25*Math.sin(heading)],i*3);this.velocity.set([(Math.random()-.5)*1.8,1+Math.random(),(Math.random()-.5)*1.8],i*3);}
 for(let i=0;i<96;i++){this.life[i]-=dt;if(this.life[i]>0){const k=i*3;this.velocity[k+1]-=dt*5;for(let j=0;j<3;j++)this.positions[k+j]+=this.velocity[k+j]*dt;this.dummy.position.fromArray(this.positions,k);this.dummy.rotation.set(this.life[i]*8,i,i*2);this.dummy.scale.setScalar(Math.min(1,this.life[i]*5));}else this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);}this.mesh.instanceMatrix.needsUpdate=true;
 }
}
