// Survival study on a copy of the live world, resumable in short chunks.
// Usage: node measure_survival.js snap.json mode totalTicks seed stateFile chunkTicks
// Releases every 3000 ticks at random points during the first 120000 ticks; random disasters ~1/6000 ticks. life is in minutes.
if(process.env.V4T)globalThis.__V4T=JSON.parse(process.env.V4T);const P=require('../sim.js');const fs=require('fs');
const [file,mode,T,seed,sf,chunk]=[process.argv[2],process.argv[3],+process.argv[4],+process.argv[5]||1,process.argv[6],+process.argv[7]||30000];
let w,st;
if(fs.existsSync(sf)){const o=JSON.parse(fs.readFileSync(sf));w=P.World.fromJSON(o.w);st=o.st;}
else{const snap=JSON.parse(fs.readFileSync(file));w=P.World.fromJSON(snap.state);w.cfg.v4From=w.tick+1;if(process.env.V5)w.cfg.v5bFrom=w.tick+1;st={t:0,rs:seed*7919+1,rel:[],start:w.tick};}
const rnd=()=>((st.rs=(st.rs*1103515245+12345)>>>0)/4294967296);const rel=st.rel;
const stop=Math.min(T,st.t+chunk);
for(;st.t<stop;st.t++){const t=st.t;
  const RE=+(process.env.REL_EVERY||3000);if(t%RE===RE/2&&t<+(process.env.REL_UNTIL||240000)){const a=rnd()*2-1,b=rnd()*2-1;if(a*a+b*b<.8){const e={type:'release',name:'S'+rel.length,owner:'p'+rel.length,x:450+a*400,y:450+b*400};w.apply(e);rel.push({sp:e.sp,born:w.tick,died:-1,peak:0});}}
  if(rnd()<1/6000){w.apply({type:['meteor','cold','toxic'][(rnd()*3)|0]});}
  w.step();st.maxPop=Math.max(st.maxPop||0,w.c.length);st.full=(st.full||0)+(w.c.length>=1100?1:0);
  if(t%300===0){const cnt=new Map();for(const k of w.c){const ro=w.species[k.sp].root;cnt.set(ro,(cnt.get(ro)||0)+1);}
    for(const r of rel){const n=cnt.get(r.sp)||0;if(n>r.peak)r.peak=n;r.cs=(r.cs||0)+n*10;if(n===0&&r.died<0)r.died=w.tick;}}
}
fs.writeFileSync(sf,JSON.stringify({w,st}));
const end=w.tick;const life=rel.map(r=>({life:((r.died<0?end:r.died)-r.born)/30/60,alive:r.died<0,peak:r.peak,cs:r.cs||0}));
console.log(JSON.stringify({mode,seed,T:st.t,done:st.t>=T,pop:w.c.length,maxPop:st.maxPop,fullTicks:st.full,life}));
