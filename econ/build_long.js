const out={casual:[],starter:[],skilled:[]},st={};
for(let s=21;s<=28;s++){const d=require('./long'+s+'.json');
 for(const r of d.rel){const cs=r.traj.reduce((a,b)=>a+b,0)*10;out[r.ty].push(cs);(st[r.ty]=st[r.ty]||[]).push({life:r.traj.length*10,alive:!r.dead,cs});}}
const life_stats={};for(const k in st){const a=st[k].map(x=>x.life).sort((x,y)=>x-y),c=st[k].map(x=>x.cs).sort((x,y)=>x-y);life_stats[k]={n:a.length,median_s:a[a.length>>1],p90_s:a[Math.floor(a.length*.9)],max_s:a[a.length-1],still_alive:st[k].filter(x=>x.alive).length,cs_median:c[c.length>>1],cs_mean:Math.round(c.reduce((x,y)=>x+y,0)/c.length),cs_max:c[c.length-1]};}
out.life_stats=life_stats;require('fs').writeFileSync('lineages_long.json',JSON.stringify(out));console.log(JSON.stringify(life_stats));
