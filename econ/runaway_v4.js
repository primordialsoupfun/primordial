// Early-empty-dish check: release into a dish thinned to N creatures, with and without v4; lineage size over 5 min.
if(process.env.V4T)globalThis.__V4T=JSON.parse(process.env.V4T);const P=require('../sim.js'),fs=require('fs');const snap=JSON.parse(fs.readFileSync(process.argv[2]));const N=+process.argv[3];
const out={};for(const v4 of [false,true]){const w=P.World.fromJSON(JSON.parse(JSON.stringify(snap.state)));w.c=w.c.slice(0,N);w.cfg.v4From=v4?w.tick:null;
 const e={type:'release',name:'R',owner:'o',x:450,y:450};w.apply(e);const tr=[];
 for(let t=0;t<9000;t++){w.step();if(t%900===899){let n=0;for(const k of w.c)if(w.species[k.sp].root===e.sp)n++;tr.push([n,w.c.length]);}}out[v4?'v4':'old']=tr;}
console.log(N,JSON.stringify(out));
