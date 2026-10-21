const {chromium}=require('playwright');
(async()=>{const br=await chromium.launch();
const cfg=[['token-mechanics.png',1600,900,'--pad:56px;--k:15px;--t:72px;--s:24px;--f:30px;--small:17px;--small2:21px;--bh:44px;--gap:34px;--cols:1.15fr 1fr'],
['token-mechanics-vertical.png',1080,1350,'--pad:56px;--k:15px;--t:66px;--s:24px;--f:30px;--small:17px;--small2:21px;--bh:44px;--gap:30px;--cols:1fr']];
for(const [f,w,h,v] of cfg){const p=await br.newPage({viewport:{width:w,height:h}});
await p.goto('file:///workspace/primordial/promo/token/page.html');await p.addStyleTag({content:`:root{--w:${w}px;--h:${h}px;${v}}`});
await p.evaluate(()=>{document.querySelectorAll('script').forEach(s=>eval(s.textContent))});
const ov=await p.evaluate(()=>[...document.querySelectorAll('.wrap *')].filter(e=>e.scrollWidth>e.clientWidth+1||e.getBoundingClientRect().bottom>innerHeight).map(e=>e.className||e.tagName).slice(0,5));
console.log(f,ov);await p.screenshot({path:'/workspace/primordial/promo/'+f});}
await br.close();})();
