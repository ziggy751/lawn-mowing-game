import WebSocket from 'ws';
import assert from 'node:assert/strict';
const base=process.env.TEST_API||'http://127.0.0.1:8787';
const {code}=await (await fetch(`${base}/api/lobbies`,{method:'POST'})).json();
const clients=[];
function connect(){return new Promise((resolve,reject)=>{const ws=new WebSocket(`${base.replace('http','ws')}/api/lobbies/${code}`);ws.on('message',data=>{const msg=JSON.parse(String(data));if(msg.type==='welcome')resolve({ws,welcome:msg});});ws.on('error',reject);});}
try{
for(let i=0;i<4;i++)clients.push(await connect());assert.equal(new Set(clients.map(c=>c.welcome.id)).size,4);
const fifth=await new Promise(resolve=>{const ws=new WebSocket(`${base.replace('http','ws')}/api/lobbies/${code}`);ws.on('unexpected-response',(_,r)=>{resolve(r.statusCode);ws.terminate();});ws.on('error',()=>{});});assert.equal(fifth,409);
const cutPromise=new Promise(resolve=>clients[1].ws.on('message',data=>{const m=JSON.parse(String(data));if(m.type==='cuts')resolve(m.cuts);}));
clients[0].ws.send(JSON.stringify({type:'move',x:0,z:8,h:0,running:true,width:.65,height:45}));const cuts=await cutPromise;assert.ok(cuts.length>0);assert.ok(cuts.every(c=>c[1]===45));
clients[0].ws.send(JSON.stringify({type:'finish'}));const info=await (await fetch(`${base}/api/lobbies/${code}`)).json();assert.equal(info.complete,false);
assert.equal((await fetch(`${base}/api/lobbies/QQQQQQ`)).status,404);
console.log(JSON.stringify({lobby:code,connections:4,fifthRejected:true,sharedCutCells:cuts.length,prematureFinishRejected:true,unknownLobbyRejected:true}));
}finally{for(const c of clients)c.ws.close();}
