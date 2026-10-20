// Usage: node perf.js <url>. Reports join time, sim ms/tick, render ms/frame, fps.
const pp=require('puppeteer-core');
(async()=>{const url=process.argv[2]||'http://localhost:8765/';const b=await pp.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const p=await b.newPage();await p.setViewport({width:1440,height:1000,deviceScaleFactor:+(process.env.DPR||2)});
if(process.env.THROTTLE){const c0=await p.createCDPSession();await c0.send('Emulation.setCPUThrottlingRate',{rate:+process.env.THROTTLE});}
const t0=Date.now();await p.goto(url,{waitUntil:'load'});
await p.waitForFunction(()=>window.__world,{timeout:120000,polling:100}).catch(()=>{});
const join=await p.evaluate(()=>window.__perf||{});const loadToJoin=Date.now()-t0;
await p.evaluate(()=>{window.__raf=0;const f=()=>{window.__raf++;requestAnimationFrame(f)};requestAnimationFrame(f);const q=window.__perf;if(q){q.step=q.steps=q.draw=q.draws=q.frames=0;}});
const cdp=await p.createCDPSession();await cdp.send('Performance.enable');const g=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));const m0=await g();
await new Promise(r=>setTimeout(r,10000));const m1=await g();const d=k=>+((m1[k]-m0[k])*100).toFixed(1);console.log('per-second ms: task',d('TaskDuration'),'script',d('ScriptDuration'),'layout',d('LayoutDuration'),'style',d('RecalcStyleDuration'),'layouts',(m1.LayoutCount-m0.LayoutCount)/10);
const m=await p.evaluate(()=>Object.assign({},window.__perf||{},{raf:window.__raf,pop:window.__world.c.length,tick:window.__world.tick}));
console.log(JSON.stringify({url,loadToJoinMs:loadToJoin,joinReplayMs:Math.round(join.joinMs),joinTicks:join.joinTicks,simMsPerTick:+(m.step/m.steps).toFixed(2),renderMsPerFrame:+(m.draw/m.draws).toFixed(2),rafFps:+(m.raf/10).toFixed(1),renderFps:m.draws!=null?+(m.draws/10).toFixed(1):null,pop:m.pop,tick:m.tick}));
await b.close();})();
