import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const base=process.env.TEST_URL||'http://127.0.0.1:5173';const errors=[];
async function client(){const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.yardwork);await page.evaluate(()=>window.yardwork.engine.quality('low'));return page;}
try{
fs.mkdirSync('artifacts',{recursive:true});
const a=await client();await a.screenshot({path:'artifacts/garden.png'});
await a.locator('#start').click();await a.keyboard.press('KeyF');await a.keyboard.down('KeyW');await a.waitForFunction(()=>window.yardwork.engine.mower.group.position.z<6);await a.keyboard.up('KeyW');
const played=await a.evaluate(()=>({progress:window.yardwork.engine.progress,z:window.yardwork.engine.mower.group.position.z,running:window.yardwork.engine.running}));assert.ok(played.progress>0);assert.ok(played.z<7);assert.equal(played.running,true);
await a.screenshot({path:'artifacts/mowing.png'});
await a.keyboard.press('Escape');await a.getByRole('button',{name:'Back to the garden'}).click();await a.locator('#finish').click();await a.locator('#submit-job').click();assert.ok(await a.getByText('Every stripe is a start.').isVisible());await a.locator('#close-modal').click();
// Real lobby creation and a second independent browser context.
await a.getByRole('button',{name:'Better together'}).click();await a.locator('#create-lobby').click();await a.waitForSelector('.lobby-code strong');const code=await a.locator('.lobby-code strong').innerText();assert.match(code,/^[A-Z0-9]{6}$/);await a.locator('#return-lobby').click();
console.log('singleplayer passed; host lobby',code);const b=await client();await b.getByRole('button',{name:'Better together'}).click();await b.locator('#lobby-code').fill(code);await b.getByRole('button',{name:'Join lobby',exact:true}).click();await b.waitForSelector('#return-lobby');await b.locator('#return-lobby').click();
console.log('lobby clients',await a.evaluate(()=>({status:window.yardwork.network.status,id:window.yardwork.network.id,remotes:window.yardwork.engine.remotes.size})),await b.evaluate(()=>({status:window.yardwork.network.status,id:window.yardwork.network.id,remotes:window.yardwork.engine.remotes.size})));await a.waitForFunction(()=>window.yardwork.engine.remotes.size===1,null,{polling:100});await b.waitForFunction(()=>window.yardwork.engine.remotes.size===1,null,{polling:100});await a.bringToFront();
await a.keyboard.press('KeyF');await a.keyboard.down('KeyW');await a.waitForFunction(()=>window.yardwork.engine.mower.group.position.z<6);await a.keyboard.up('KeyW');
await b.waitForFunction(()=>window.yardwork.engine.progress>0,null,{polling:100});await a.keyboard.press('KeyF');await a.waitForTimeout(400);
const stateA=await a.evaluate(()=>Array.from(window.yardwork.engine.heights));const stateB=await b.evaluate(()=>Array.from(window.yardwork.engine.heights));assert.deepEqual(stateA,stateB);
const progress=await b.evaluate(()=>window.yardwork.engine.progress);await b.evaluate(()=>window.yardwork.network.leave());await a.waitForFunction(()=>window.yardwork.engine.remotes.size===0,null,{polling:100});
await b.evaluate(code=>window.yardwork.network.join(code),code);await b.waitForFunction(()=>window.yardwork.engine.progress>0,null,{polling:100});assert.equal(await b.evaluate(()=>window.yardwork.engine.progress),progress);
await a.screenshot({path:'artifacts/cooperative.png'});
// Menu interactions and persistent career data.
await a.getByRole('button',{name:'Settings',exact:true}).click();await a.locator('#cut-height').selectOption('60');assert.equal(await a.evaluate(()=>window.yardwork.engine.cutHeight),60);await a.locator('#close-modal').click();
await a.getByRole('button',{name:'My garage',exact:true}).click();assert.equal(await a.locator('.shop-card').count(),4);await a.locator('#close-modal').click();
await a.setViewportSize({width:390,height:844});await a.screenshot({path:'artifacts/mobile.png'});assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);console.log(JSON.stringify({singleplayer:played,multiplayer:{code,clients:2,sharedCoverage:progress,reconnect:true},errors,screenshots:'artifacts/'}));
}finally{await browser.close();}
