const puppeteer=require('puppeteer-core');const fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1600,height:1000,deviceScaleFactor:2});
await p.setRequestInterception(true);let T0;
p.on('request',async r=>{if(r.url().includes('/api/snapshot')){const j=await (await fetch(r.url())).json();const s=j.serverTick;T0=s;
 const o='9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
 j.events.push({type:'release',name:'Lantern Drifter',owner:o,at:s+20,n:99001,ok:true},{type:'release',name:'Ash Nomad',owner:o,at:s+25,n:99002,ok:true},{type:'release',name:'Copper Veil',owner:o,at:s+30,n:99003,ok:true},{type:'meteor',x:430,y:690,at:s+1500,n:99004,ok:true,owner:o});
 r.respond({status:200,contentType:'application/json',body:JSON.stringify(j)});}else r.continue();});
await p.goto('http://localhost:8765/?pick=released',{waitUntil:'load'});await sleep(4000);
async function cap(name,sel,n,fps){const el=typeof sel==='string'?await p.$(sel):null;fs.mkdirSync('promo/raw2/'+name,{recursive:true});
 for(let i=0;i<n;i++){const t=Date.now();const path=`promo/raw2/${name}/${String(i).padStart(4,'0')}.png`;if(el)await el.screenshot({path});else await p.screenshot({path,clip:sel});const d=1000/fps-(Date.now()-t);if(d>0)await sleep(d);}console.log('done',name,Date.now());}
await cap('tank','#tank',50,12);
await cap('brain','#brain',30,12);
const box=await p.evaluate(()=>{const a=document.getElementById('specimen').getBoundingClientRect(),z=document.getElementById('skilltree').getBoundingClientRect();return{x:a.x-10,y:a.y-10,width:a.width+20,height:z.bottom-a.y+20}});
await cap('panel',box,6,3);
const sb=await p.evaluate(()=>{const e=document.getElementById('standing').closest('section')||document.getElementById('standing').parentElement.parentElement;const a=e.getBoundingClientRect();return{x:a.x-10,y:a.y+window.scrollY-10,width:a.width+20,height:a.height+20}});
await cap('board',sb,6,3);
// wait for meteor (~1500 ticks); poll tick
await cap('meteor','#tank',1,1);
const fs2=fs; const start=Date.now();
while(true){const t=await p.evaluate(()=>+document.getElementById('tick').textContent.replace(/\D/g,''));if(t>=T0+1440)break;await sleep(200);if(Date.now()-start>120000)break;}
await cap('meteor','#tank',72,12);
await cap('board2',sb,4,2);
await b.close();})();
