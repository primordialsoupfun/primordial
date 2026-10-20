'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const P=require('./sim.js'),Org=require('./organism.js'),Card=require('./card.js');
const C=require('./chain.js');const {web3,spl,conn}=C;
const PORT=+process.env.PORT||8765,HZ=+process.env.TICK_HZ||30,LEAD=+process.env.LEAD||45;
const SEED=+process.env.SEED||20261021;
const TICKER=process.env.TICKER||'SOUP',PUBLIC_URL=(process.env.PUBLIC_URL||'https://primordialsoup.fun').replace(/\/$/,'');
const CFG={epochTicks:+process.env.EPOCH_TICKS||3000,prizeShare:+process.env.PRIZE_SHARE||0.2,split:[0.5,0.3,0.2]};
const COMMIT_TICKS=+process.env.COMMIT_TICKS||1500,BURN_INTERVAL=+process.env.BURN_INTERVAL_S||120,MOCK_RATE=+process.env.MOCK_RATE||100000; // tokens per SOL, dry-run quote
const L=web3.LAMPORTS_PER_SOL;
const PRICES={food:0.01*L,meteor:0.05*L,cold:0.03*L,toxic:0.03*L,release:0.10*L};
const FOOD_BURN=50; // tokens, alternative to SOL for feeding
const DATA=process.env.DATA_DIR||__dirname+'/data';require('fs').mkdirSync(DATA,{recursive:true});const _D=0,LEDGER=DATA+'/ledger.json';
let ledger=fs.existsSync(LEDGER)?JSON.parse(fs.readFileSync(LEDGER)):{seed:SEED,cfg:CFG,events:[],used:{},revenue:0,pool:0,burnQueue:0,burns:[],commits:[],payouts:[],tokensBurned:0,traitBurned:0};
const save=()=>fs.writeFileSync(LEDGER,JSON.stringify(ledger,null,1));
// Canonical world: rebuild from seed + log on boot.
let W=new P.World(ledger.seed,ledger.cfg);const byTick=new Map();
for(const e of ledger.events){if(!byTick.has(e.at))byTick.set(e.at,[]);byTick.get(e.at).push(e);}
let snapshot=null;const clients=new Set();let live=false;const rl=new Map();
function stepWorld(){const evs=byTick.get(W.tick)||[];const before=W.epochs.length;W.step(evs);
  for(const e of evs)if(e.type==='release'&&e.sp!=null)e.spId=e.sp;
  if(W.tick%300===0)snapshot={tick:W.tick,state:JSON.stringify(W)};
  if(W.tick%500===0)broadcast('hash',{t:W.tick,h:W.hash()});
  if(W.tick%COMMIT_TICKS===0&&live)commit(W.tick,W.hash());
  if(W.epochs.length>before&&live)payout(W.epochs[W.epochs.length-1]);}
// fast-forward to wall clock position on boot (simple: replay to last known tick)
const target=ledger.lastTick||0;while(W.tick<target)stepWorld();
snapshot={tick:W.tick,state:JSON.stringify(W)};

// SSE

function broadcast(type,data){const s=`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;for(const r of clients)r.write(s);}
setInterval(()=>{stepWorld();if(W.tick%15===0){broadcast('tick',{t:W.tick});ledger.lastTick=W.tick;}},1000/HZ);
setInterval(save,5000);
function schedule(ev){ev.at=W.tick+LEAD;ev.n=ledger.events.length;ledger.events.push(ev);if(!byTick.has(ev.at))byTick.set(ev.at,[]);byTick.get(ev.at).push(ev);save();broadcast('event',ev);return ev;}
// ---- chain
let treasury,mintInfo,MINT;
async function commit(t,h){try{const sig=await C.send([C.memoIx(`primordial:commit:${t}:${h}:${ledger.events.length}`,treasury.publicKey)],[treasury]);ledger.commits.push({t,h,sig});broadcast('chain',{kind:'commit',t,h,sig});}catch(e){console.error('commit failed',e.message);}}
async function payout(ep){
  const pool=ledger.pool;if(pool<=0||!ep.winners.length){ledger.payouts.push({epoch:ep.epoch,tick:ep.tick,winners:ep.winners,txs:[],note:'empty pool'});return;}
  const txs=[];let paid=0;
  for(const w of ep.winners){let to;try{to=new web3.PublicKey(w.owner);}catch(e){continue;}const lam=Math.floor(pool*w.share);if(lam<5000)continue;
    try{const sig=await C.send([web3.SystemProgram.transfer({fromPubkey:treasury.publicKey,toPubkey:to,lamports:lam}),C.memoIx(`primordial:prize:${ep.epoch}:${w.place}:${w.sp}`,treasury.publicKey)],[treasury]);txs.push({place:w.place,owner:w.owner,sp:w.sp,name:w.name,lamports:lam,sig});paid+=lam;}catch(e){console.error('payout failed',e.message);}}
  ledger.pool-=paid;ledger.payouts.push({epoch:ep.epoch,tick:ep.tick,winners:ep.winners,txs});save();broadcast('chain',{kind:'payout',epoch:ep.epoch,txs});}
async function burnJob(){
  const lam=ledger.burnQueue;if(lam<=0)return;
  const tokens=BigInt(Math.floor(lam/L*MOCK_RATE*1e6)); // DRY RUN: no swap is executed; treasury test tokens stand in for bought-back tokens
  try{const sig=await spl.burn(conn,treasury,new web3.PublicKey(mintInfo.treasuryAta),MINT,treasury,tokens);
    const amount=Number(tokens)/1e6;ledger.burnQueue-=lam;ledger.tokensBurned+=amount;
    const rec={at:new Date().toISOString(),solIn:lam/L,quote:'dry-run, no Jupiter swap',tokens:amount,sig};ledger.burns.push(rec);save();broadcast('chain',Object.assign({kind:'burn'},rec));}
  catch(e){console.error('burn failed',e.message);}}
// ---- verification
const parseMemo=tx=>{for(const ix of tx.transaction.message.instructions){if(ix.programId.equals(C.MEMO)){const s=typeof ix.parsed==='string'?ix.parsed:'';if(s.startsWith('primordial:v1:'))return JSON.parse(s.slice(14));}}return null;};
async function verify(sig){
  if(typeof sig!=='string'||sig.length<60||sig.length>100)throw new Error('bad signature');
  if(ledger.used[sig])throw new Error('signature already used');
  let tx=null;for(let i=0;i<20&&!tx;i++){tx=await conn.getParsedTransaction(sig,{commitment:'confirmed',maxSupportedTransactionVersion:0});if(!tx)await new Promise(r=>setTimeout(r,500));}
  if(!tx)throw new Error('transaction not found or not confirmed');
  if(tx.meta.err)throw new Error('transaction failed on chain');
  const payer=tx.transaction.message.accountKeys[0].pubkey.toBase58();
  const m=parseMemo(tx);if(!m||!m.t)throw new Error('missing primordial memo');
  let lam=0,burned=0;
  const ixs=tx.transaction.message.instructions.concat(...(tx.meta.innerInstructions||[]).map(x=>x.instructions));
  for(const ix of ixs){if(!ix.parsed)continue;
    if(ix.program==='system'&&ix.parsed.type==='transfer'&&ix.parsed.info.destination===treasury.publicKey.toBase58()&&ix.parsed.info.source===payer)lam+=ix.parsed.info.lamports;
    if(ix.program==='spl-token'&&(ix.parsed.type==='burn'||ix.parsed.type==='burnChecked')&&ix.parsed.info.mint===MINT.toBase58()&&ix.parsed.info.authority===payer)burned+=Number(ix.parsed.info.amount||ix.parsed.info.tokenAmount.amount)/1e6;}
  const ev={type:m.t,owner:payer,sig};
  const num=v=>typeof v==='number'&&isFinite(v)?Math.max(20,Math.min(880,v)):undefined;
  if(m.x!=null){ev.x=num(m.x);ev.y=num(m.y);}
  if(m.t==='trait'){const T=P.TREE[m.trait];if(!T)throw new Error('unknown trait');const cost=P.TRAIT_BURN[T.tier];if(burned<cost)throw new Error(`burn of ${cost} tokens required`);
    const S=W.species[m.sp|0];if(!S||S.owner!==payer||S.root!==S.id)throw new Error('only the releaser can evolve this species');if(!W.eligible(S.id,m.trait))throw new Error('milestone not reached or branch locked');
    ev.sp=S.id;ev.trait=m.trait;ev.burned=burned;ledger.traitBurned+=burned;ledger.tokensBurned+=burned;}
  else if(m.t==='food'&&burned>=FOOD_BURN){ev.burned=burned;ledger.tokensBurned+=burned;}
  else{const price=PRICES[m.t];if(!price)throw new Error('unknown event');if(lam<price)throw new Error('payment below price');
    ev.lamports=lam;ledger.revenue+=lam;
    if(m.t==='release'){const name=String(m.name||'').replace(/[^\w .'-]/g,'').trim().slice(0,24);if(!name)throw new Error('name required');ev.name=name;const pool=Math.floor(lam*CFG.prizeShare);ledger.pool+=pool;ledger.burnQueue+=lam-pool;}
    else ledger.burnQueue+=lam;}
  ledger.used[sig]=1;return schedule(ev);}
// ---- http
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const json=(res,o,code=200)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(o));};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function spName(s){return s.name||('Specimen '+s.id);}
function cardData(kind,id){
  if(kind==='species'){const S=W.species[id];if(!S)return null;const root=W.species[S.root];const st=W.lineageStats(S.root);
    return {kicker:S.released?'Released species':'Wild species',title:spName(S),subtitle:`${S.released?'Released by '+short(S.owner)+'. ':''}Lineage of ${st.alive} living organisms, ${st.maxGen} generations deep, through ${S.disastersSurvived} disaster${S.disastersSurvived===1?"":"s"}.`,
      sp:S,root,tick:W.tick,traits:S.traits.map(t=>P.TREE[t].label),stats:[['Alive',st.alive],['Generations',st.maxGen],['Origin epoch',S.born],['Disasters',S.disastersSurvived],['Species no.',S.id],['Score',(W.scores().find(x=>x.sp===S.root)||{score:0}).score]]};}
  if(kind==='event'){const e=ledger.events[id];if(!e)return null;const S=e.spId!=null?W.species[e.spId]:(e.sp!=null?W.species[e.sp]:null);
    const T={food:'A food bloom',meteor:'A meteor strike',cold:'A cold front',toxic:'A toxic bloom',release:'Release of '+(e.name||''),trait:'An evolution'}[e.type];
    return {kicker:'Event no. '+e.n,title:T,subtitle:`Entered the public log at epoch ${e.at} by ${short(e.owner)}.${e.trait?' Trait: '+P.TREE[e.trait].label+'.':''}`,sp:S,root:S?W.species[S.root]:null,tick:e.at,stats:[['Epoch',e.at],['Organisms now',W.c.length],['Living species',W.species.filter(s=>s.count).length]]};}
  if(kind==='hall'){const p=ledger.payouts.filter(x=>x.winners.length).slice(-1)[0];if(!p)return null;const w=p.winners[0];const S=W.species[w.sp];
    return {kicker:'Hall of Survivors, epoch '+p.epoch,title:w.name,subtitle:`First place. ${w.alive} descendants alive after ${w.ticks} ticks.`,sp:S,root:S,tick:p.tick,stats:p.winners.map(x=>['Place '+x.place,x.name])};}
}
const short=a=>a&&a.length>12?a.slice(0,4)+'...'+a.slice(-4):a||'unknown';
let canvasMod=null;try{canvasMod=require('@napi-rs/canvas');}catch(e){}
function ogPng(d){const c=canvasMod.createCanvas(1200,630);Card.card(c.getContext('2d'),d,Org,{serif:'serif',mono:'monospace'});return c.toBuffer('image/png');}
function sharePage(res,kind,id,host){const d=cardData(kind,id);if(!d){res.writeHead(404);return res.end('not found');}
  const base=PUBLIC_URL,img=`${base}/og/${kind}/${id}.png`,title=`${d.title} | Primordial`,desc=d.subtitle,target=kind==='species'?`/?sp=${id}`:kind==='event'?`/?ev=${id}`:'/?hall=1';
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${img}">
<link rel="canonical" href="${base}/${{species:'s',event:'e',hall:'h'}[kind]}/${id}"><meta property="og:url" content="${base}/${{species:'s',event:'e',hall:'h'}[kind]}/${id}"><meta property="og:site_name" content="Primordial">
<meta http-equiv="refresh" content="0; url=${target}"></head><body><a href="${target}">Open the tank</a></body></html>`);}
http.createServer(async(req,res)=>{
  const u=url.parse(req.url,true),p=u.pathname;
  try{
  if(p==='/api/stream'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'});res.write(`event: tick\ndata: ${JSON.stringify({t:W.tick})}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return;}
  if(p==='/api/snapshot'){const evs=ledger.events.filter(e=>e.at>=snapshot.tick);res.writeHead(200,{'content-type':'application/json'});return res.end(`{"tick":${snapshot.tick},"serverTick":${W.tick},"events":${JSON.stringify(evs)},"state":${snapshot.state}}`);}
  if(p==='/api/config')return json(res,{rpc:'/api/rpc',cluster:process.env.CLUSTER||(/127\.0\.0\.1|localhost/.test(C.RPC)?'localnet':'devnet'),treasury:treasury.publicKey.toBase58(),mint:MINT.toBase58(),prices:PRICES,foodBurn:FOOD_BURN,traitBurn:P.TRAIT_BURN,cfg:CFG,hz:HZ,seed:ledger.seed,ticker:TICKER,publicUrl:PUBLIC_URL,tree:P.TREE});
  if(p==='/api/ledger'){const L2=Object.assign({},ledger);delete L2.used;delete L2.events;L2.eventCount=ledger.events.length;L2.recent=ledger.events.slice(-30);L2.scores=W.scores().slice(0,10);L2.epochs=W.epochs.slice(-5);return json(res,L2);}
  if(p==='/api/rpc'&&req.method==='POST'){let b='';for await(const ch of req){b+=ch;if(b.length>4096)break;}let j;try{j=JSON.parse(b);}catch(e){return json(res,{error:'bad json'},400);}
    const ok=['getLatestBlockhash','getSignatureStatuses','getBalance','getAccountInfo','getTokenAccountBalance'];const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;
    const now=Date.now();const r=rl.get(ip)||[];const recent=r.filter(t=>now-t<60000);if(recent.length>60)return json(res,{error:'rate limited'},429);recent.push(now);rl.set(ip,recent);
    if(!j||Array.isArray(j)||!ok.includes(j.method))return json(res,{error:'method not allowed'},403);
    const up=await fetch(C.RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:j.id||1,method:j.method,params:j.params||[]})});res.writeHead(up.status,{'content-type':'application/json'});return res.end(await up.text());}
  if(p==='/api/submit'&&req.method==='POST'){let b='';for await(const ch of req)b+=ch;try{const ev=await verify(JSON.parse(b).sig);return json(res,{ok:true,event:ev});}catch(e){return json(res,{ok:false,error:e.message},400);}}
  let m;
  if((m=p.match(/^\/og\/(species|event|hall)\/(\d+)\.png$/))){const d=cardData(m[1],+m[2]);if(!d||!canvasMod){res.writeHead(200,{'content-type':'image/png'});return fs.createReadStream(__dirname+'/icons/og-fallback.png').pipe(res);}res.writeHead(200,{'content-type':'image/png','cache-control':'max-age=60'});return res.end(ogPng(d));}
  if((m=p.match(/^\/(s|e|h)\/(\d+)$/)))return sharePage(res,{s:'species',e:'event',h:'hall'}[m[1]],+m[2],req.headers.host);
  let f=p==='/'?'/index.html':p;if(f.startsWith('/vendor/web3.js'))f='/node_modules/@solana/web3.js/lib/index.iife.min.js';
  if(/^\/icons\/(favicon\.ico|favicon-32\.png|apple-touch-icon\.png|icon-512\.png|og-fallback\.png)$/.test(f)){res.writeHead(200,{'content-type':f.endsWith('.ico')?'image/x-icon':'image/png','cache-control':'max-age=86400'});return fs.createReadStream(__dirname+f).pipe(res);}
  if(f==='/favicon.ico'){res.writeHead(200,{'content-type':'image/x-icon'});return fs.createReadStream(__dirname+'/icons/favicon.ico').pipe(res);}
  const allowed=['/index.html','/style.css','/sim.js','/organism.js','/card.js','/app.js','/node_modules/@solana/web3.js/lib/index.iife.min.js'];
  if(!allowed.includes(f)){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(__dirname+f).pipe(res);
  }catch(e){console.error(e);json(res,{ok:false,error:'server error'},500);}
}).listen(PORT,()=>console.log('primordial on http://localhost:'+PORT));
(async()=>{treasury=C.load('treasury');await C.fund(treasury).catch(e=>console.error('airdrop',e.message));mintInfo=await C.setupMint(treasury);MINT=new web3.PublicKey(mintInfo.mint);
  live=true;console.log('chain ready',C.RPC,'treasury',treasury.publicKey.toBase58(),'mint',mintInfo.mint);setInterval(burnJob,BURN_INTERVAL*1000);})();
