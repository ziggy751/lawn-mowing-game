import test from 'node:test';
import assert from 'node:assert/strict';
import { freshLawn,mowCells,coverage,LAWN } from '../src/game/lawn';
test('deck cuts only its circular footprint and preserves missed grass',()=>{const h=freshLawn();const cuts=mowCells(0,0,0,.65,45,h);assert.ok(cuts.length>0);for(const [i,height]of cuts){const x=LAWN.minX+(i%LAWN.cols+.5)*LAWN.cell,z=LAWN.minZ+(Math.floor(i/LAWN.cols)+.5)*LAWN.cell;assert.ok(x*x+z*z<=(.65/2)**2);assert.equal(height,45);}assert.ok(coverage(h)>0&&coverage(h)<.01);assert.equal(h[0],255);});
test('overlapping passes are idempotent and taller cuts never regrow grass',()=>{const h=freshLawn();mowCells(0,0,0,.65,30,h);assert.equal(mowCells(0,0,0,.65,60,h).length,0);assert.equal(mowCells(0,0,0,.65,30,h).length,0);});
test('full raster mowing completes the contract with both stripe directions',()=>{const h=freshLawn();const dirs=new Set<number>();for(let x=-10;x<=10;x+=.4)for(let z=-7;z<=11;z+=.2)for(const cut of mowCells(x,z,x%1>.5?0:Math.PI,.65,45,h))dirs.add(cut[2]);assert.ok(coverage(h)>.99);assert.equal(dirs.size,2);});
test('cutting outside the property makes no changes',()=>{const h=freshLawn();assert.deepEqual(mowCells(100,100,0,.65,45,h),[]);assert.equal(coverage(h),0);});
