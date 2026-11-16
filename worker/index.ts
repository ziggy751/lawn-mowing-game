import { DurableObject } from 'cloudflare:workers';
import { freshLawn, mowCells, coverage } from '../src/game/lawn';
interface Env { ROOMS:DurableObjectNamespace<Room>; ASSETS:Fetcher }
type Player={id:string;x:number;z:number;h:number;running:boolean;width:number;height:number;last:number};
export default {async fetch(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url);
 if(url.pathname==='/api/lobbies'&&req.method==='POST'){
  for(let attempt=0;attempt<5;attempt++){const code=crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase();
  const room=env.ROOMS.get(env.ROOMS.idFromName(code));const init=await room.fetch(new Request('https://room/init',{method:'POST'}));
  if(init.ok)return Response.json({code});}return Response.json({error:'Could not reserve a lobby. Please try again.'},{status:503});
 }
 const match=url.pathname.match(/^\/api\/lobbies\/([A-Z0-9]{6})$/);
 if(match)return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(req);
 if(url.pathname.startsWith('/api/'))return Response.json({error:'Lobby not found.'},{status:404});
 return env.ASSETS.fetch(req);
}};
export class Room extends DurableObject<Env>{
 heights=freshLawn();directions=new Uint8Array(this.heights.length);players=new Map<WebSocket,Player>();initialized=false;complete=false;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get<{heights:number[];directions:number[];complete:boolean}>('lawn');if(saved){this.heights=new Uint8Array(saved.heights);this.directions=new Uint8Array(saved.directions);this.complete=saved.complete;}this.initialized=await ctx.storage.get<boolean>('initialized')??false;});}
 async fetch(req:Request){
 if(new URL(req.url).pathname==='/init'){if(this.initialized)return new Response('Already exists',{status:409});this.initialized=true;await this.ctx.storage.put('initialized',true);return new Response('OK');}
 if(!this.initialized)return Response.json({error:'That lobby does not exist. Check the code.'},{status:404});
 if(req.headers.get('Upgrade')!=='websocket')return Response.json({players:this.players.size,complete:this.complete});
 if(this.players.size>=4)return new Response('This lobby is full.',{status:409});
 const pair=new WebSocketPair();const [client,server]=Object.values(pair);server.accept();
 const id=crypto.randomUUID();const player:Player={id,x:this.players.size*1.2,z:8,h:0,running:false,width:.65,height:45,last:Date.now()};this.players.set(server,player);
 server.send(JSON.stringify({type:'welcome',id,heights:Array.from(this.heights),directions:Array.from(this.directions),players:[...this.players.values()],complete:this.complete}));this.broadcast({type:'player',...player},server);
 server.addEventListener('message',async event=>{try{
 const msg=JSON.parse(String(event.data));if(msg.type==='ping'){server.send(JSON.stringify({type:'pong',t:msg.t}));return;}
 if(msg.type==='finish'&&!this.complete&&coverage(this.heights)>=.9){this.complete=true;await this.persist();this.broadcast({type:'complete',payout:Math.round((85+coverage(this.heights)*45)/this.players.size)});return;}
 if(msg.type!=='move'||this.complete)return;
 const now=Date.now(),dt=Math.min((now-player.last)/1000,.3);player.last=now;
 if(![msg.x,msg.z,msg.h].every(Number.isFinite))return;
 const dx=msg.x-player.x,dz=msg.z-player.z,dist=Math.hypot(dx,dz),allowed=dt*4+.08;
 if(dist>allowed){player.x+=dx/dist*allowed;player.z+=dz/dist*allowed;}else{player.x=msg.x;player.z=msg.z;}
 player.x=Math.max(-9.8,Math.min(9.8,player.x));player.z=Math.max(-6.8,Math.min(10.8,player.z));player.h=msg.h;
 player.width=[.65,.85,1.15,.42].includes(msg.width)?msg.width:.65;player.height=[30,45,60,80].includes(msg.height)?msg.height:45;player.running=!!msg.running;
 const cuts=player.running?mowCells(player.x,player.z,player.h,player.width,player.height,this.heights):[];
 for(const [i,,d]of cuts)this.directions[i]=d;
 this.broadcast({type:'player',...player});if(cuts.length){this.broadcast({type:'cuts',cuts});await this.ctx.storage.setAlarm(Date.now()+2000);}
 }catch{server.send(JSON.stringify({type:'error',message:'Invalid room message.'}));}});
 const leave=()=>{if(this.players.delete(server))this.broadcast({type:'leave',id});};server.addEventListener('close',leave);server.addEventListener('error',leave);
 return new Response(null,{status:101,webSocket:client});
 }
 broadcast(msg:unknown,except?:WebSocket){const data=JSON.stringify(msg);for(const ws of this.players.keys())if(ws!==except)try{ws.send(data);}catch{this.players.delete(ws);}}
 async persist(){await this.ctx.storage.put('lawn',{heights:Array.from(this.heights),directions:Array.from(this.directions),complete:this.complete});}
 async alarm(){await this.persist();}
}
