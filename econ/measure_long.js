// Long measurement: releases every 20000 ticks rotating casual/starter/skilled; trajectories sampled every 300 ticks until end. Usage: node measure_long.js seed ticks
const P=require('../sim.js');const [seed,T]=process.argv.slice(2).map(Number);
const w=new P.World(seed);let rs=seed*7919+1;const rnd=()=>((rs=(rs*1103515245+12345)>>>0)/4294967296);
const TYPES=['casual','starter','skilled'];const rel=[];
const bestVent=()=>{let b=null,bv=-1;for(const v of w.vents){let n=0;for(const f of w.food){const dx=f.x-v[0],dy=f.y-v[1];if(dx*dx+dy*dy<3600)n++;}if(n>bv){bv=n;b=v;}}return b;};
for(let t=0;t<T;t++){
  if(t%20000===2000){const ty=TYPES[rel.length%3];const e={type:'release',name:'L'+rel.length,owner:ty};if(ty!=='casual'){const v=bestVent();e.x=v[0];e.y=v[1];}w.apply(e);rel.push({sp:e.sp,ty,born:t,traj:[]});}
  if(rnd()<1/5000)w.apply({type:['meteor','cold','toxic'][(rnd()*3)|0]});
  if(rnd()<1/1500)w.apply({type:'food'});
  if(t%300===0){for(const r of rel){const list=r.ty==='skilled'?['meta1','sense1','res1','loco1','meta2','sense2','symb','res2']:r.ty==='starter'?['meta1']:[];for(const tr of list)if(w.eligible(r.sp,tr))w.apply({type:'trait',sp:r.sp,owner:r.ty,trait:tr});}
    const cnt=new Map();for(const k of w.c){const ro=w.species[k.sp].root;cnt.set(ro,(cnt.get(ro)||0)+1);}for(const r of rel)if(!r.dead){const n=cnt.get(r.sp)||0;r.traj.push(n);if(n===0&&r.traj.length>1)r.dead=1;}}
  w.step();}
console.log(JSON.stringify({seed,T,rel:rel.map(r=>({ty:r.ty,born:r.born,traits:w.species[r.sp].traits,dead:!!r.dead,traj:r.traj}))}));
