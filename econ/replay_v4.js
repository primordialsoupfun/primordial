// Checkpoint replay check across the v4 switch on a copy of the live world.
const P=require('../sim.js'),fs=require('fs');const snap=JSON.parse(fs.readFileSync(process.argv[2]));
const mk=()=>{const w=P.World.fromJSON(JSON.parse(JSON.stringify(snap.state)));w.cfg.v4From=w.tick+300;w.cfg.v5bFrom=w.tick+300;return w;};
const ev=t=>t===600?[{type:'release',name:'R',owner:'o',x:400,y:400}]:t===1500?[{type:'food'}]:null;
const a=mk();const ha=[];for(let t=0;t<3000;t++){a.step(ev(t));if(t%300===299)ha.push(a.hash());}
let b=mk();const hb=[];for(let t=0;t<3000;t++){b.step(ev(t));if(t%300===299)hb.push(b.hash());if(t===1199)b=P.World.fromJSON(JSON.parse(JSON.stringify(b)));}
const sp=a.species.find(s=>s.name==='R');
console.log(JSON.stringify({match:ha.join()===hb.join(),hashes:ha.length,releaseBornTick:sp.bornTick,alive:sp.count}));
