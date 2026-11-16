export const LAWN = { minX: -10, maxX: 10, minZ: -7, maxZ: 11, cell: 0.25, cols: 80, rows: 72 };
export const CELLS = LAWN.cols * LAWN.rows;
export type Cut = [number, number, number];
export function terrain(x: number, z: number) { return Math.sin(x * .22) * .055 + Math.cos(z * .24) * .045; }
export function mowCells(x: number, z: number, heading: number, width: number, height: number, heights: Uint8Array): Cut[] {
  const cuts: Cut[] = [];
  const r = width / 2;
  const minC = Math.max(0, Math.floor((x-r-LAWN.minX)/LAWN.cell));
  const maxC = Math.min(LAWN.cols-1, Math.floor((x+r-LAWN.minX)/LAWN.cell));
  const minR = Math.max(0, Math.floor((z-r-LAWN.minZ)/LAWN.cell));
  const maxR = Math.min(LAWN.rows-1, Math.floor((z+r-LAWN.minZ)/LAWN.cell));
  const bend = Math.round((((heading % (Math.PI*2)) + Math.PI*2) % (Math.PI*2))/(Math.PI*2)*255);
  for(let row=minR;row<=maxR;row++) for(let col=minC;col<=maxC;col++) {
    const cx=LAWN.minX+(col+.5)*LAWN.cell, cz=LAWN.minZ+(row+.5)*LAWN.cell;
    if ((cx-x)**2+(cz-z)**2 > r*r) continue;
    const i=row*LAWN.cols+col;
    if(heights[i] > height) { heights[i]=height; cuts.push([i,height,bend]); }
  }
  return cuts;
}
export function coverage(heights: Uint8Array) { let n=0; for(const h of heights) if(h<100)n++; return n/heights.length; }
export function freshLawn() { return new Uint8Array(CELLS).fill(255); }
export function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
