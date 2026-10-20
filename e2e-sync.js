const pp=require('puppeteer-core');
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--window-size=1440,1500']});
  const open=async q=>{const bx=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});const p=await bx.newPage();await p.setViewport({width:1440,height:1500});p.on('pageerror',e=>console.log('pageerror',e.message));await p.goto((process.env.BASE||'http://localhost:8765')+'/'+q,{waitUntil:'load'});return p;};
  const a=await open(process.env.Q||'?pick=released&zoom=4');await new Promise(r=>setTimeout(r,20000));
  const b=await open('');  // late joiner
  await new Promise(r=>setTimeout(r,36000));
  const ha=await a.evaluate(()=>window.__hashes||[]),hb=await b.evaluate(()=>window.__hashes||[]);
  const mb=new Map(hb.map(h=>[h[0],h]));const common=ha.filter(h=>mb.has(h[0])).map(h=>({tick:h[0],clientA:h[1],clientB:mb.get(h[0])[1],server:h[2],match:h[1]===mb.get(h[0])[1]&&h[1]===h[2]}));
  console.log(JSON.stringify({aChecks:ha.length,bChecks:hb.length,common},null,1));
  require('fs').writeFileSync(__dirname+'/data/e2e-sync.json',JSON.stringify(common,null,1));
  await a.screenshot({path:__dirname+'/screenshot-sync.png'});
  await b.goto((process.env.BASE||'http://localhost:8765')+'/?pick=released',{waitUntil:'load'});await new Promise(r=>setTimeout(r,6000));await b.screenshot({path:__dirname+'/screenshot-sync-full.png'});process.exit(0);})();
