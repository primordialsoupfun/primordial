const puppeteer=require('puppeteer-core');const fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1600,height:1000,deviceScaleFactor:2});
await p.setRequestInterception(true);const o='9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
p.on('request',async r=>{const u=r.url();
 if(u.includes('/api/snapshot')){const j=await (await fetch(u)).json();const s=j.serverTick;
  j.events.push({type:'meteor',x:430,y:690,at:s+180,n:99004,ok:true,owner:o});
  return r.respond({status:200,contentType:'application/json',body:JSON.stringify(j)});}
 if(u.includes('/api/ledger')){const j=await (await fetch(u)).json();
  j.scores=[{name:'Lantern Drifter',score:4812,alive:41,ticks:9120,owner:o},{name:'Copper Veil',score:3377,alive:26,ticks:8410,owner:'4Hc2pQm7RkV9sT1yWn8bZx3LfD6aJeGu5oPiKr2MvNt'},{name:'Ash Nomad',score:1904,alive:12,ticks:6020,owner:'Bq7mZ1xR4tY8uW2eN6cV9pL3kJ5hG0fD7sA1qE8wTy'}];
  return r.respond({status:200,contentType:'application/json',body:JSON.stringify(j)});}
 r.continue();});
await p.goto('http://localhost:8765/',{waitUntil:'load'});await sleep(3000);
fs.mkdirSync('promo/raw3/meteor',{recursive:true});
for(let i=0;i<60;i++){await p.$eval('#tank',()=>0);const el=await p.$('#tank');await el.screenshot({path:`promo/raw3/meteor/${String(i).padStart(4,'0')}.png`});}
const sb=await p.evaluate(()=>{const e=document.getElementById('standing').parentElement.parentElement;const a=e.getBoundingClientRect();return{x:a.x-10,y:a.y+scrollY-10,width:a.width+20,height:a.height+20}});
await p.screenshot({path:'promo/raw3/board.png',clip:sb});
await b.close();})();
