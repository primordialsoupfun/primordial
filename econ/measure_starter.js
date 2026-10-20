// Measures released-lineage trajectories in the real sim.js. Usage: node measure.js seed ticks weather(0|1)
const P=require('../sim.js');const [seed,T,wx]=process.argv.slice(2).map(Number);
const w=new P.World(seed);let rs=seed*7919+1;const rnd=()=>((rs=(rs*1103515245+12345)>>>0)/4294967296);
const rel=[];const SAMPLE=300;
for(let t=0;t<T;t++){const ev=[];
  if(t%4000===2000){const skilled=true;const e={type:'release',name:'L'+rel.length,owner:'skilled'};
    if(skilled){const v=w.vents[(rnd()*3)|0];e.x=v[0];e.y=v[1];}
    ev.push(e);w.apply(e);rel.push({sp:e.sp,skilled,born:t,traj:[],tried:{}});ev.length=0;}
  if(wx&&rnd()<1/5000){const k=['meteor','cold','toxic'][(rnd()*3)|0];w.apply({type:k});}
  if(rnd()<1/1500)w.apply({type:'food'});
  // skilled players buy traits as soon as eligible
  if(t%300===0)for(const r of rel)if(r.skilled)for(const tr of ['meta1'])if(w.eligible(r.sp,tr))w.apply({type:'trait',sp:r.sp,owner:'skilled',trait:tr});
  w.step();
  if(t%SAMPLE===0){const cnt=new Map();for(const k of w.c){const ro=w.species[k.sp].root;cnt.set(ro,(cnt.get(ro)||0)+1);}
    for(const r of rel)r.traj.push(cnt.get(r.sp)||0);r_tot=w.c.length;(globalThis.tot=globalThis.tot||[]).push(w.c.length);}
}
console.log(JSON.stringify({seed,wx,sample:SAMPLE,tot:globalThis.tot,rel:rel.map(r=>({skilled:r.skilled,born:r.born,traits:w.species[r.sp].traits,traj:r.traj}))}));
