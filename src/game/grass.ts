import * as T from 'three';
import { LAWN, CELLS, terrain, seeded, type Cut } from './lawn';
export class Grass {
  group = new T.Group();
  data = new Uint8Array(CELLS*4);
  texture: T.DataTexture;
  material: T.ShaderMaterial;
  chunks=0;
  constructor(scene: T.Scene) {
    for(let i=0;i<CELLS;i++) { this.data[i*4]=255; this.data[i*4+3]=255; }
    this.texture = new T.DataTexture(this.data,LAWN.cols,LAWN.rows); this.texture.needsUpdate=true;
    this.material=new T.ShaderMaterial({side:T.DoubleSide, uniforms:{uTime:{value:0},uWind:{value:1},uMap:{value:this.texture},uCamera:{value:new T.Vector3()}},vertexShader:`
      precision highp float;
      attribute vec3 offset; attribute vec3 variation;
      uniform float uTime; uniform float uWind; uniform sampler2D uMap;
      varying float vT; varying float vShade; varying vec3 vWorld; varying vec2 vBend;
      void main(){
        vec2 uv=(offset.xz-vec2(-10.,-7.))/vec2(20.,18.);
        vec4 state=texture2D(uMap,uv); float cut=state.r;
        float h=mix(.075,variation.x,cut); float t=position.y;
        float a=variation.y*6.28318; float angle=state.g*6.28318;
        vec2 bend=vec2(sin(angle),cos(angle));
        float wind=(sin(uTime*1.4+offset.x*.6+offset.z*.8)+sin(uTime*2.3+offset.z*1.5)*.25)*.075*uWind;
        vec3 p=vec3(position.x*cos(a),t*h,position.x*sin(a));
        p.xz+=vec2(sin(a),cos(a))*t*t*.10*cut;
        p.xz+=(vec2(.8,.35)*wind*cut+bend*.055*(1.-cut))*t*t;
        p+=offset;
        vT=t; vShade=variation.z; vWorld=p; vBend=bend*(1.-cut);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,fragmentShader:`
      precision highp float;
      uniform vec3 uCamera; varying float vT; varying float vShade; varying vec3 vWorld; varying vec2 vBend;
      void main(){
        vec3 dark=vec3(.025,.075,.009); vec3 tip=vec3(.22,.34,.045);
        vec3 col=mix(dark,tip,pow(vT,.7)); col*=.79+vShade*.37;
        vec2 view=normalize(uCamera.xz-vWorld.xz);
        col*=1.+dot(vBend,view)*.24;
        float fog=smoothstep(25.,85.,distance(uCamera,vWorld));
        gl_FragColor=vec4(mix(col,vec3(.76,.82,.77),fog),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    const rand=seeded(42);
    for(let cz=0;cz<6;cz++) for(let cx=0;cx<8;cx++) {
      const n=1050, geo=new T.InstancedBufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute([-.021,0,0,.021,0,0,-.014,.5,0,.014,.5,0,0,1,0],3));
      geo.setIndex([0,1,2,1,3,2,2,3,4]);
      const offsets=new Float32Array(n*3), vars=new Float32Array(n*3);
      for(let i=0;i<n;i++) { const x=-10+(cx+rand())*2.5,z=-7+(cz+rand())*3; offsets.set([x,terrain(x,z)+.018,z],i*3);vars.set([.22+rand()*.37,rand(),rand()],i*3); }
      geo.setAttribute('offset',new T.InstancedBufferAttribute(offsets,3)); geo.setAttribute('variation',new T.InstancedBufferAttribute(vars,3)); geo.instanceCount=n;
      geo.boundingSphere=new T.Sphere(new T.Vector3(-10+(cx+.5)*2.5,.3,-7+(cz+.5)*3),2.6);
      const mesh=new T.Mesh(geo,this.material);this.group.add(mesh);this.chunks++;
    }
    scene.add(this.group);
  }
  apply(cuts: Cut[]) { for(const [i,h,d] of cuts) { this.data[i*4]=h;this.data[i*4+1]=d; } this.texture.needsUpdate=true; }
  reset(){for(let i=0;i<CELLS;i++){this.data[i*4]=255;this.data[i*4+1]=0;}this.texture.needsUpdate=true;}
  update(t:number,camera:T.Camera){this.material.uniforms.uTime.value=t;this.material.uniforms.uCamera.value.copy(camera.position);}
  density(v:number){for(const m of this.group.children)(m as T.Mesh<T.InstancedBufferGeometry>).geometry.instanceCount=Math.round(1050*v);}
}
