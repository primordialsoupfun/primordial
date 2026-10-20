const puppeteer=require('puppeteer-core');const fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
async function shot(name,url,sel,n,fps,setup,meteor){
  const p=await b.newPage();await p.setViewport({width:1600,height:1000,deviceScaleFactor:2});
  if(meteor){await p.setRequestInterception(true);p.on('request',async r=>{if(r.url().includes('/api/snapshot')){const res=await fetch(r.url());const j=await res.json();j.events.push({type:'meteor',x:450,y:450,at:j.serverTick+75,n:99999,ok:true,owner:'demo',lamports:0});r.respond({status:200,contentType:'application/json',body:JSON.stringify(j)});}else r.continue();});}
  await p.goto(url,{waitUntil:'load'});await sleep(2500);if(setup)await setup(p);
  const el=await p.$(sel);fs.mkdirSync('promo/raw/'+name,{recursive:true});
  for(let i=0;i<n;i++){const t=Date.now();await el.screenshot({path:`promo/raw/${name}/${String(i).padStart(4,'0')}.png`});const d=1000/fps-(Date.now()-t);if(d>0)await sleep(d);}
  await p.close();console.log('done',name);
}
const U='http://localhost:8765/';
await shot('tank',U,'#tank',60,12);
await shot('zoom',U+'?pick=released&zoom=6','#tank',60,12);
await shot('brain',U+'?pick=released','#brain',40,12);
await shot('tree',U+'?pick=released','#skilltree',8,4);
await shot('meteor',U,'#tank',70,12,null,true);
await shot('board',U,'#standing',8,4);
await b.close();})();
