import type { Engine } from './engine';
import type { Cut } from './lawn';
export class Network {
 ws?:WebSocket;id='';code='';latency=0;status='Offline';timer?:ReturnType<typeof setInterval>;onChange:()=>void=()=>{};onComplete:(payout:number)=>void=()=>{};
 constructor(private engine:Engine){}
 async create(){const response=await fetch('/api/lobbies',{method:'POST'});if(!response.ok)throw new Error('Lobby service unavailable. Run npm run dev:cloud for multiplayer.');let data;try{data=await response.json() as {code:string};}catch{throw new Error('Multiplayer needs the Cloudflare server. Use npm run dev:cloud.');}if(!data.code)throw new Error('Lobby service unavailable.');return this.join(data.code);}
 async join(code:string){this.leave();code=code.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code))throw new Error('Enter the 6-character lobby code.');const response=await fetch(`/api/lobbies/${code}`);if(!response.ok)throw new Error('Lobby not found or unavailable. Check the code.');let info;try{info=await response.json() as {players:number;complete:boolean};}catch{throw new Error('Multiplayer needs npm run dev:cloud.');}if(info.players>=4)throw new Error('This lobby is full.');if(info.complete)throw new Error('This job is finished. Create a fresh lobby.');
 this.engine.reset();this.code=code;this.status='Connecting';this.onChange();
 await new Promise<void>((resolve,reject)=>{
 const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/lobbies/${code}`);this.ws=ws;const timeout=setTimeout(()=>{ws.close();reject(new Error('Connection timed out. Try again.'));},10000);
 ws.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.type==='welcome'){clearTimeout(timeout);this.id=msg.id;this.status='Connected';this.engine.authoritative=true;const cuts:Cut[]=msg.heights.map((h:number,i:number)=>[i,h,msg.directions[i]]);this.engine.apply(cuts);for(const p of msg.players)if(p.id!==this.id)this.engine.remote(p.id,p.x,p.z,p.h);this.onChange();resolve();}
 if(msg.type==='player'&&msg.id!==this.id)this.engine.remote(msg.id,msg.x,msg.z,msg.h);
 if(msg.type==='cuts')this.engine.apply(msg.cuts);if(msg.type==='leave')this.engine.removeRemote(msg.id);if(msg.type==='pong')this.latency=Date.now()-msg.t;if(msg.type==='complete')this.onComplete(msg.payout);
 };
 ws.onerror=()=>{clearTimeout(timeout);reject(new Error('Could not connect to lobby.'));};ws.onclose=()=>{clearTimeout(timeout);clearInterval(this.timer);this.status='Disconnected';this.engine.active=false;this.engine.authoritative=false;this.onChange();};
 });
 this.timer=setInterval(()=>{if(this.ws?.readyState!==WebSocket.OPEN)return;const p=this.engine.mower.group.position;this.ws.send(JSON.stringify({type:'move',x:p.x,z:p.z,h:this.engine.heading,running:this.engine.active&&this.engine.running,width:this.engine.tool.width,height:this.engine.cutHeight}));if(Date.now()%1000<110)this.ws.send(JSON.stringify({type:'ping',t:Date.now()}));},100);
 }
 finish(){this.ws?.send(JSON.stringify({type:'finish'}));}
 leave(){if(this.ws){this.ws.onclose=null;this.ws.close();}clearInterval(this.timer);this.ws=undefined;this.code='';this.id='';this.status='Offline';this.engine.authoritative=false;for(const id of [...this.engine.remotes.keys()])this.engine.removeRemote(id);this.onChange();}
}
