(function(){
'use strict';
const P=window.Primordial,O=window.Organism,$=id=>document.getElementById(id);
const qs=new URLSearchParams(location.search);
const INK='#111314',INK2='#5b554a',RULE='#cbbfa6',RUST='#c9531a',PAPER='#f3eddb';
const MONO='"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace',SERIF='"Iowan Old Style",Palatino,Georgia,serif';
const DPR=Math.min(2,window.devicePixelRatio||1);
const tank=$('tank'),tc=tank.getContext('2d'),brain=$('brain'),bc=brain.getContext('2d'),tree=$('tree'),trc=tree.getContext('2d');
for(const c of [tank,brain,tree]){c.dataset.w=c.width;c.dataset.h=c.height;c.width*=DPR;c.height*=DPR;}
const srvHash=new Map();let CFG=null,W=null,evAt=new Map(),target=0,sel=null,mark=null,ledger=null,wallet=null,hashOk=null,lastHash=null;
const view={z:1,ox:0,oy:0};
const trails=new Map();
const short=a=>a&&a.length>12?a.slice(0,4)+'...'+a.slice(-4):(a||'');
const explorer=sig=>`https://explorer.solana.com/tx/${sig}?cluster=${CFG.cluster==='localnet'?'custom&customUrl='+encodeURIComponent('http://127.0.0.1:8899'):CFG.cluster==='mainnet'?'mainnet-beta':'devnet'}`;
const tk=()=>CFG?CFG.ticker:'SOUP';
function spName(s){if(!s)return'';if(s.name)return s.name+(s.root!==s.id?' var. '+s.id:'');const G=['Protomyx','Ciliata','Velum','Spirella','Nautilla','Coccus','Phaeo','Diatoma'],L=['ambulator','natans','vorax','lentus','gyrans','pallidus','ferox','minutus','errans','obscurus','velox','rubens'];return `${G[s.id%G.length]} ${L[(s.id*7+3)%L.length]} ${s.id}`;}

// ---------- sync
function addEv(e){if(!evAt.has(e.at))evAt.set(e.at,[]);const a=evAt.get(e.at);if(!a.some(x=>x.n===e.n))a.push(e);a.sort((x,y)=>x.n-y.n);}
async function boot(){
  CFG=await (await fetch('/api/config')).json();
  document.querySelectorAll('.tk').forEach(e=>e.textContent=CFG.ticker);
  $('cluster').textContent=({localnet:'Local validator',devnet:'Devnet',mainnet:'Mainnet'}[CFG.cluster]||CFG.cluster)+' prototype. Treasury '+short(CFG.treasury)+'.';
  await resync();
  const es=new EventSource('/api/stream');
  es.addEventListener('tick',m=>{target=JSON.parse(m.data).t;});
  es.addEventListener('event',m=>{const e=JSON.parse(m.data);addEv(e);if(e.at<W.tick){setSync('Late event, resyncing',false);resync();}});
  es.addEventListener('hash',m=>{const d=JSON.parse(m.data);srvHash.set(d.t,d.h);checkHash(d.t);});
  es.addEventListener('chain',()=>loadLedger());
  loadLedger();setInterval(loadLedger,10000);
  requestAnimationFrame(loop);
}
async function resync(){const s=await (await fetch('/api/snapshot')).json();W=P.World.fromJSON(s.state);evAt=new Map();for(const e of s.events)addEv(e);target=s.serverTick;
  while(W.tick<target)stepOne();window.__world=W;}
function stepOne(){const evs=evAt.get(W.tick)||[];W.step(evs);evAt.delete(W.tick-1);
  if(srvHash.has(W.tick))checkHash(W.tick);}
function checkHash(t){if(W.tick!==t||!srvHash.has(t))return;{const h=srvHash.get(t);srvHash.delete(t);const mine=W.hash();hashOk=mine===h;window.__hashes=(window.__hashes||[]).concat([[W.tick,mine,h]]);
  setSync(hashOk?`In agreement with the canonical tank. Hash ${mine} at epoch ${W.tick}.`:'Diverged. Resyncing.',hashOk);if(!hashOk)resync();}}
function setSync(t,ok){const e=$('sync');e.textContent=t;e.className='sync'+(ok?'':' bad');}

// ---------- plate background
const plate=document.createElement('canvas');plate.width=900*DPR;plate.height=900*DPR;
function drawPlate(){const c=plate.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);const{CX,CY,R}=P;
  const gr=c.createRadialGradient(CX-80,CY-110,40,CX,CY,R+10);gr.addColorStop(0,'#f0eadb');gr.addColorStop(.75,'#e7e0cd');gr.addColorStop(1,'#d9d0b9');
  c.fillStyle=gr;c.beginPath();c.arc(CX,CY,R,0,7);c.fill();
  let s=1;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  for(let i=0;i<9000;i++){const a=rnd()*6.283,r=Math.sqrt(rnd())*R;c.fillStyle=`rgba(60,50,30,${rnd()*.05})`;c.fillRect(CX+Math.cos(a)*r,CY+Math.sin(a)*r,1,1);}
  c.strokeStyle=INK;c.lineWidth=1.2;c.beginPath();c.arc(CX,CY,R+.5,0,7);c.stroke();c.lineWidth=.5;c.beginPath();c.arc(CX,CY,R+9,0,7);c.stroke();
  c.strokeStyle='rgba(17,19,20,.10)';c.setLineDash([2,5]);for(const f of [.33,.66]){c.beginPath();c.arc(CX,CY,R*f,0,7);c.stroke();}
  c.beginPath();c.moveTo(CX-R,CY);c.lineTo(CX+R,CY);c.moveTo(CX,CY-R);c.lineTo(CX,CY+R);c.stroke();c.setLineDash([]);
  c.strokeStyle=INK;c.lineWidth=.6;for(let i=0;i<360;i+=2){const a=i*Math.PI/180,l=i%30===0?9:i%10===0?5:3;c.beginPath();c.moveTo(CX+Math.cos(a)*(R+9),CY+Math.sin(a)*(R+9));c.lineTo(CX+Math.cos(a)*(R+9+l),CY+Math.sin(a)*(R+9+l));c.stroke();}
  c.fillStyle=INK2;c.font=`9px ${MONO}`;c.textAlign='center';c.textBaseline='middle';for(let i=0;i<360;i+=30){const a=(i-90)*Math.PI/180;c.fillText(String(i).padStart(3,'0'),CX+Math.cos(a)*(R+28),CY+Math.sin(a)*(R+28));}}
drawPlate();

// ---------- tank render
function drawTank(){
  const c=tc;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,900,900);
  c.save();c.translate(view.ox,view.oy);c.scale(view.z,view.z);c.drawImage(plate,0,0,900,900);
  c.beginPath();c.arc(P.CX,P.CY,P.R,0,7);c.clip();
  const z=view.z*(tank.clientWidth/900||1);
  // thermal vents: concentric fine rings
  for(const v of W.vents){c.strokeStyle='rgba(201,83,26,.18)';c.lineWidth=.5/view.z;for(let r=10;r<=50;r+=10){c.beginPath();c.arc(v[0],v[1],r,0,7);c.stroke();}
    c.fillStyle='rgba(91,85,74,.55)';c.font=`italic ${11/view.z}px ${SERIF}`;c.textAlign='center';c.fillText('thermal vent',v[0],v[1]+62);}
  if(W.cold>0){c.fillStyle=`rgba(78,96,108,${Math.min(.14,W.cold/2500)})`;c.fillRect(0,0,900,900);}
  for(const t of W.toxic){c.strokeStyle='rgba(201,83,26,.32)';c.lineWidth=.6/view.z;c.save();c.beginPath();c.arc(t.x,t.y,t.r,0,7);c.clip();
    for(let x=-t.r;x<t.r;x+=7){c.beginPath();c.moveTo(t.x+x,t.y-t.r);c.lineTo(t.x+x+t.r,t.y+t.r);c.stroke();}c.restore();
    c.setLineDash([3,3]);c.strokeStyle=RUST;c.beginPath();c.arc(t.x,t.y,t.r,0,7);c.stroke();c.setLineDash([]);
    c.fillStyle=RUST;c.font=`italic ${12/view.z}px ${SERIF}`;c.textAlign='center';c.fillText('toxic bloom',t.x,t.y-t.r-6/view.z);}
  for(const k of W.craters){const age=W.tick-k.t;if(age>2400)continue;const a=1-age/2400;
    c.strokeStyle=`rgba(17,19,20,${.5*a})`;c.lineWidth=.7/view.z;c.setLineDash([1,3]);c.beginPath();c.arc(k.x,k.y,k.r,0,7);c.stroke();c.setLineDash([]);
    c.fillStyle=`rgba(17,19,20,${.55*a})`;c.font=`italic ${12/view.z}px ${SERIF}`;c.textAlign='center';c.fillText('impact, epoch '+k.t,k.x,k.y-k.r-6/view.z);}
  const vis=(x,y,m)=>{const sx=x*view.z+view.ox,sy=y*view.z+view.oy;return sx>-m&&sx<900+m&&sy>-m&&sy<900+m;};
  for(let i=0;i<W.food.length;i++){const f=W.food[i];if(vis(f.x,f.y,10))O.algae(c,f,i,z);}
  const S=W.species;
  for(const k of W.c){let tr=trails.get(k.id);if(!tr){tr=[];trails.set(k.id,tr);}
    if((W.tick&3)===0){tr.push(k.x,k.y);if(tr.length>18)tr.splice(0,2);}
    if(!vis(k.x,k.y,30))continue;const sp=S[k.sp];
    if(tr.length>=4){c.strokeStyle=`rgba(${sp.col[0]},${sp.col[1]},${sp.col[2]},.22)`;c.lineWidth=.6/view.z;c.beginPath();c.moveTo(tr[0],tr[1]);for(let i=2;i<tr.length;i+=2)c.lineTo(tr[i],tr[i+1]);c.lineTo(k.x,k.y);c.stroke();}
    O.draw(c,k,sp,S[sp.root],2.4+Math.min(1.6,k.e*.8),z,W.tick,1);}
  if(W.tick%200===0){const alive=new Set(W.c.map(k=>k.id));for(const id of trails.keys())if(!alive.has(id))trails.delete(id);}
  if(mark){c.strokeStyle=RUST;c.lineWidth=.8/view.z;const m=8/view.z;c.beginPath();c.moveTo(mark[0]-m,mark[1]);c.lineTo(mark[0]+m,mark[1]);c.moveTo(mark[0],mark[1]-m);c.lineTo(mark[0],mark[1]+m);c.stroke();
    c.beginPath();c.arc(mark[0],mark[1],m*1.6,0,7);c.stroke();c.fillStyle=RUST;c.font=`italic ${12/view.z}px ${SERIF}`;c.textAlign='left';c.fillText('your mark',mark[0]+m*2,mark[1]+4/view.z);}
  if(sel&&W.c.includes(sel)){const s=1/view.z;c.strokeStyle=INK;c.lineWidth=.8*s;c.beginPath();c.arc(sel.x,sel.y,16*s,0,7);c.stroke();
    c.beginPath();c.moveTo(sel.x+11*s,sel.y-11*s);c.lineTo(sel.x+40*s,sel.y-40*s);c.lineTo(sel.x+130*s,sel.y-40*s);c.stroke();
    c.fillStyle=INK;c.font=`italic ${13*s}px ${SERIF}`;c.textAlign='left';c.fillText(spName(S[sel.sp]),sel.x+44*s,sel.y-45*s);}
  c.restore();
}
// ---------- zoom / pan / pick
const toWorld=(e)=>{const r=tank.getBoundingClientRect(),sx=(e.clientX-r.left)*900/r.width,sy=(e.clientY-r.top)*900/r.height;return[(sx-view.ox)/view.z,(sy-view.oy)/view.z,sx,sy];};
function zoomAt(f,sx,sy){const nz=Math.max(1,Math.min(14,view.z*f));view.ox=sx-(sx-view.ox)*nz/view.z;view.oy=sy-(sy-view.oy)*nz/view.z;view.z=nz;if(nz===1){view.ox=0;view.oy=0;}}
tank.addEventListener('wheel',e=>{e.preventDefault();const[, ,sx,sy]=toWorld(e);zoomAt(e.deltaY<0?1.18:1/1.18,sx,sy);},{passive:false});
$('zin').onclick=()=>zoomAt(1.5,450,450);$('zout').onclick=()=>zoomAt(1/1.5,450,450);$('zreset').onclick=()=>{view.z=1;view.ox=0;view.oy=0;};
let drag=null;
tank.addEventListener('mousedown',e=>{drag={x:e.clientX,y:e.clientY,ox:view.ox,oy:view.oy,moved:false};});
window.addEventListener('mousemove',e=>{if(!drag)return;const r=tank.getBoundingClientRect(),k=900/r.width,dx=(e.clientX-drag.x)*k,dy=(e.clientY-drag.y)*k;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.moved&&view.z>1){view.ox=drag.ox+dx;view.oy=drag.oy+dy;}});
window.addEventListener('mouseup',e=>{if(drag&&!drag.moved&&e.target===tank)pick(e);drag=null;});
function pick(e){const[x,y]=toWorld(e);let best=null,bd=(14/view.z)**2;for(const k of W.c){const d=(k.x-x)**2+(k.y-y)**2;if(d<bd){bd=d;best=k;}}
  if(best){sel=best;drawSpecimen();drawSkill();}else{mark=[Math.round(x),Math.round(y)];$('markinfo').textContent=`Mark set at ${mark[0]}, ${mark[1]}.`;}}

// ---------- brain
const INL=['food L','food R','kin L','kin R','energy','cold','toxin','wall','bias'],OUTL=['turn','thrust','signal'];
function drawBrain(){const c=bc,w=560,h=280;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,w,h);
  if(!sel||!W.c.includes(sel)){c.fillStyle=INK2;c.font=`italic 13px ${SERIF}`;c.fillText('The neural network of the selected organism appears here.',0,20);return;}
  const{NI,NH,NO}=P,g=sel.g,a=sel.act,col=(n,x)=>Array.from({length:n},(_,i)=>[x,24+i*(h-48)/(n-1||1)]);
  const L0=col(NI,92),L1=col(NH,290),L2=[[480,75],[480,140],[480,205]];
  const edge=(A,B,wv,s)=>{const m=Math.min(1,Math.abs(wv)/2.5),live=Math.min(1,Math.abs(s*wv));c.strokeStyle=wv>0?`rgba(17,19,20,${.05+m*.22+live*.35})`:`rgba(201,83,26,${.05+m*.22+live*.35})`;c.lineWidth=.4+m*1.1;c.beginPath();c.moveTo(A[0],A[1]);c.bezierCurveTo((A[0]+B[0])/2,A[1],(A[0]+B[0])/2,B[1],B[0],B[1]);c.stroke();};
  let p=0;for(let hh=0;hh<NH;hh++)for(let i=0;i<NI;i++)edge(L0[i],L1[hh],g[p++],a[i]);
  p=NI*NH+NH;for(let o=0;o<NO;o++)for(let hh=0;hh<NH;hh++)edge(L1[hh],L2[o],g[p+o*NH+hh],a[NI+hh]);
  const node=(pt,v,lab,left)=>{const t=Math.min(1,Math.abs(v));if(t>.05){const gr=c.createRadialGradient(pt[0],pt[1],0,pt[0],pt[1],16);gr.addColorStop(0,`rgba(196,140,60,${.5*t})`);gr.addColorStop(1,'rgba(196,140,60,0)');c.fillStyle=gr;c.beginPath();c.arc(pt[0],pt[1],16,0,7);c.fill();}
    c.fillStyle=PAPER;c.strokeStyle=INK;c.lineWidth=.8;c.beginPath();c.arc(pt[0],pt[1],5.5,0,7);c.fill();c.stroke();c.fillStyle=v>=0?`rgba(17,19,20,${t})`:`rgba(201,83,26,${t})`;c.beginPath();c.arc(pt[0],pt[1],3.6*t+.4,0,7);c.fill();
    if(lab){c.fillStyle=INK2;c.font=`11px ${MONO}`;c.textBaseline='middle';c.textAlign=left?'right':'left';c.fillText(lab,pt[0]+(left?-12:12),pt[1]);}};
  L0.forEach((pt,i)=>node(pt,a[i],INL[i],true));L1.forEach((pt,i)=>node(pt,a[NI+i]));L2.forEach((pt,i)=>node(pt,a[NI+NH+i],OUTL[i],false));
  c.fillStyle=INK2;c.font=`9px ${MONO}`;c.textAlign='center';c.textBaseline='alphabetic';c.fillText('SENSORY',92,h-2);c.fillText('HIDDEN',290,h-2);c.fillText('MOTOR',480,h-2);}
// ---------- lineage
function drawTree(){const c=trc,w=560,h=240;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,w,h);
  const sp=W.species.filter(s=>s.peak>=6||s.released),set=new Set(sp.map(s=>s.id)),kids=new Map();
  for(const s of sp){let p=s.parent;while(p>=0&&!set.has(p))p=W.species[p].parent;s._p=p;if(!kids.has(p))kids.set(p,[]);kids.get(p).push(s);}
  const order=[];(function walk(p){for(const s of (kids.get(p)||[])){order.push(s);walk(s.id);}})(-1);
  const top=new Set(W.species.filter(s=>s.count>0).sort((a,b)=>b.count-a.count).slice(0,9).map(s=>s.id));const rows=order.filter(s=>top.has(s.id)||(s.released&&s.root===s.id)).slice(-22),T=W.tick||1,x=t=>36+(t/T)*(w-170),rh=(h-30)/Math.max(rows.length,1),Y=new Map();rows.forEach((s,i)=>Y.set(s.id,10+i*rh));
  c.strokeStyle=RULE;c.lineWidth=.5;c.fillStyle=INK2;c.font=`9px ${MONO}`;c.textAlign='center';for(let i=0;i<=4;i++){const t=Math.round(T*i/4),xx=x(t);c.beginPath();c.moveTo(xx,4);c.lineTo(xx,h-18);c.stroke();c.fillText(t,xx,h-6);}
  for(const s of rows){const y=Y.get(s.id),end=s.died>=0?s.died:T,alive=s.count>0;
    if(Y.has(s._p)){c.strokeStyle='rgba(17,19,20,.4)';c.lineWidth=.6;c.beginPath();c.moveTo(x(s.born),Y.get(s._p));c.lineTo(x(s.born),y);c.stroke();}
    c.strokeStyle=alive?`rgb(${s.col})`:'rgba(91,85,74,.45)';c.lineWidth=alive?Math.min(4,1+s.count/40):.8;c.beginPath();c.moveTo(x(s.born),y);c.lineTo(x(end),y);c.stroke();
    if(sel&&W.species[sel.sp].id===s.id){c.fillStyle=INK;c.beginPath();c.arc(x(end),y,2.5,0,7);c.fill();}
    if(alive||s.released){c.fillStyle=s.released?RUST:INK;c.font=`italic 10.5px ${SERIF}`;c.textAlign='left';c.textBaseline='middle';c.fillText(spName(s)+'  '+s.count,x(end)+6,y);}}}
// ---------- specimen + skill tree
function drawSpecimen(){const el=$('specimen');if(!sel||!W.c.includes(sel)){if(sel){el.className='specimen empty';el.textContent='The selected organism has died.';sel=null;$('cardrow').hidden=true;}return;}
  const s=W.species[sel.sp],root=W.species[s.root];el.className='specimen';$('cardrow').hidden=false;
  el.innerHTML=`<div class="name"></div><div class="meta"><span>No. ${sel.id}</span><span>Generation ${sel.gen}</span><span>Age ${sel.age}</span><span>Energy ${sel.e.toFixed(2)} <span class="ebar"></span></span><span>Lineage ${root.released?'released by '+short(root.owner):'wild'}</span><span>Kin alive ${s.count}</span></div>`;
  el.querySelector('.name').textContent=spName(s);
  el.querySelector('.ebar').textContent='|'.repeat(Math.max(0,Math.min(20,Math.round(sel.e*10))));}
function drawSkill(){const el=$('skilltree');const s=sel&&W.c.includes(sel)?W.species[W.species[sel.sp].root]:null;
  if(!s||!s.released){el.className='skilltree empty';el.textContent=s?'Wild lineages evolve on their own. Only released species carry an evolution tree.':'Select an organism from a released species to see its evolution tree.';return;}
  el.className='skilltree';el.innerHTML='';const st=W.lineageStats(s.id),mine=wallet&&wallet===s.owner;
  for(const [id,T] of Object.entries(P.TREE)){const on=s.traits.includes(id),locked=T.lock&&s.traits.includes(T.lock),ready=!on&&W.eligible(s.id,id);
    const d=document.createElement('div');d.className='node'+(on?' on':locked?' lock':ready?' ready':'');
    const q=T.req,req=[q.gen?`gen ${st.maxGen}/${q.gen}`:'',q.pop?`pop ${st.alive}/${q.pop}`:'',q.disasters?`disasters ${s.disastersSurvived}/${q.disasters}`:''].filter(Boolean).join(', ');
    d.innerHTML=`<span class="br">${T.branch} ${T.tier===1?'I':'II'}</span><span class="lb">${T.label}</span><span class="st">${on?'Active':locked?'Branch closed':ready?'Open, burn '+P.TRAIT_BURN[T.tier]+' '+tk():(T.need&&!s.traits.includes(T.need)?'Needs '+P.TREE[T.need].label.toLowerCase():req)}</span>`;
    if(ready&&mine){const b=document.createElement('button');b.textContent='Burn and evolve';b.onclick=()=>buy({t:'trait',sp:s.id,trait:id},0,P.TRAIT_BURN[T.tier]);d.append(document.createElement('br'),b);}
    el.append(d);}}
// ---------- ledger panels
async function loadLedger(){try{ledger=await (await fetch('/api/ledger')).json();}catch(e){return;}
  $('burn').textContent=Math.round(ledger.tokensBurned).toLocaleString('en-US');$('pool').textContent=(ledger.pool/1e9).toFixed(3)+' SOL';
  const st=$('standing');st.innerHTML='';(ledger.scores||[]).slice(0,5).forEach((w,i)=>{const li=document.createElement('li');li.innerHTML=`<span class="pl">${i+1}</span><span class="nm"></span><span class="sc">${w.score}</span><span class="sub">${w.alive} alive, ${w.ticks} ticks, ${short(w.owner)}</span>`;li.querySelector('.nm').textContent=w.name;st.append(li);});
  if(!st.children.length)st.innerHTML='<li><span></span><span class="muted">No released lineage alive.</span></li>';
  const se=$('seasons');se.innerHTML='';ledger.payouts.slice().reverse().slice(0,4).forEach(p=>{for(const t of (p.txs.length?p.txs:p.winners.map(w=>({place:w.place,name:w.name,owner:w.owner})))){const li=document.createElement('li');
    li.innerHTML=`<span class="pl">${t.place}</span><span class="nm"></span><span class="sc">${t.lamports?(t.lamports/1e9).toFixed(4)+' SOL':''}</span><span class="sub">Season ${p.epoch}, ${short(t.owner)} ${t.sig?`<a href="${explorer(t.sig)}" target="_blank">payout tx</a>`:''} <a href="${share('Hall of Survivors, season '+p.epoch+'. '+t.name+' placed '+t.place+'.', '/h/'+p.epoch)}" target="_blank">Share on X</a></span>`;li.querySelector('.nm').textContent=t.name;se.append(li);}});
  if(!se.children.length)se.innerHTML='<li><span></span><span class="muted">The first season has not closed.</span></li>';
  const cl=$('chainlog');cl.innerHTML='';
  const rows=[].concat(ledger.burns.map(b=>({t:b.at,txt:`Burned ${Math.round(b.tokens).toLocaleString('en-US')} ${tk()} for ${b.solIn.toFixed(3)} SOL, dry run`,sig:b.sig})),ledger.commits.slice(-6).map(c=>({t:c.t,txt:`Committed hash ${c.h} at epoch ${c.t}`,sig:c.sig})));
  for(const r of rows.slice(-10).reverse()){const li=document.createElement('li');li.innerHTML=`<span></span><a target="_blank"></a>`;li.firstChild.textContent=r.txt;li.lastChild.href=explorer(r.sig);li.lastChild.textContent='tx';cl.append(li);}
  if(!rows.length)cl.innerHTML='<li><span class="muted">No burns or commits yet.</span></li>';
  drawLog();}
const LBL={food:'Food bloom',meteor:'Meteor strike',cold:'Cold front',toxic:'Toxic bloom',release:'Released',trait:'Evolved'};
function drawLog(){const ol=$('log');ol.innerHTML='';if(!ledger)return;
  for(const e of ledger.recent.slice().reverse()){const li=document.createElement('li');const b=document.createElement('b');b.textContent=String(e.at).padStart(6,'0');const s=document.createElement('span');
    s.textContent=LBL[e.type]+(e.name?' '+e.name:'')+(e.trait?' '+P.TREE[e.trait].label.toLowerCase():'')+(e.lamports?`  ${(e.lamports/1e9).toFixed(2)} SOL`:'')+(e.burned?`  burned ${e.burned}`:'')+'  '+short(e.owner);
    const a=document.createElement('a');a.href=explorer(e.sig);a.target='_blank';a.textContent='tx';const x=document.createElement('a');x.href=share(evText(e),'/e/'+e.n);x.target='_blank';x.textContent='share';x.style.marginLeft='8px';
    li.append(b,s,a,x);ol.append(li);}
  if(!ol.children.length)ol.innerHTML='<li><span class="muted">The log is empty. Seed '+CFG.seed+'.</span></li>';}
const evText=e=>({release:`I released ${e.name} into the Primordial tank. Can it survive?`,trait:`My lineage just evolved ${e.trait?P.TREE[e.trait].label.toLowerCase():''} in the Primordial tank.`,meteor:'I just dropped a meteor on the Primordial tank.',food:'I fed the Primordial tank. Watch who gets there first.',cold:'A cold front is moving through the Primordial tank.',toxic:'A toxic bloom just opened in the Primordial tank.'}[e.type]||'Primordial');
function share(text,path){return 'https://x.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(CFG.publicUrl+path);}
$('sharesp').onclick=()=>{if(!sel)return;const s=W.species[sel.sp];window.open(share(`${spName(s)}, ${s.count} alive in the Primordial tank.`,'/s/'+s.id),'_blank');};
$('cardpng').onclick=()=>{if(!sel)return;const s=W.species[sel.sp],st=W.lineageStats(s.root),cv=document.createElement('canvas');cv.width=1200;cv.height=630;
  Card.card(cv.getContext('2d'),{kicker:s.released?'Released species':'Wild species',title:spName(s),subtitle:`${st.alive} living organisms in this lineage, ${st.maxGen} generations deep.`,sp:s,root:W.species[s.root],tick:W.tick,traits:s.traits.map(t=>P.TREE[t].label),stats:[['Alive',s.count],['Generation',sel.gen],['Origin epoch',s.born],['Disasters',s.disastersSurvived],['Species no.',s.id],['Energy',sel.e.toFixed(2)]]},O,{serif:SERIF,mono:MONO});
  const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download=`primordial-${s.id}.png`;a.click();};
// ---------- wallet + payments
const provider=()=>window.phantom&&window.phantom.solana||window.solflare||window.solana||null;
$('connect').onclick=async()=>{const pv=provider();if(!pv){toast('No Solana wallet found. Install Phantom or Solflare and switch it to devnet.');return;}
  const r=await pv.connect();wallet=(r&&r.publicKey||pv.publicKey).toString();$('who').textContent=short(wallet);$('connect').firstChild.textContent='Connected';drawSkill();};
function toast(html){const t=$('toast');t.hidden=false;t.innerHTML=html;}
async function buy(memo,lamports,burnTokens){const pv=provider();if(!pv||!wallet){toast('Connect a wallet first.');return;}
  const w3=window.solanaWeb3,conn=new w3.Connection(location.origin+CFG.rpc,'confirmed'),me=new w3.PublicKey(wallet),tx=new w3.Transaction();
  if(lamports)tx.add(w3.SystemProgram.transfer({fromPubkey:me,toPubkey:new w3.PublicKey(CFG.treasury),lamports}));
  if(burnTokens){const TOKEN=new w3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),ATA=new w3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWQ5ZPWE3amH9zLA1'),mint=new w3.PublicKey(CFG.mint);
    const [acct]=w3.PublicKey.findProgramAddressSync([me.toBuffer(),TOKEN.toBuffer(),mint.toBuffer()],ATA);const data=new Uint8Array(9);data[0]=8;new DataView(data.buffer).setBigUint64(1,BigInt(burnTokens)*1000000n,true);
    tx.add(new w3.TransactionInstruction({programId:TOKEN,keys:[{pubkey:acct,isSigner:false,isWritable:true},{pubkey:mint,isSigner:false,isWritable:true},{pubkey:me,isSigner:true,isWritable:false}],data}));}
  tx.add(new w3.TransactionInstruction({programId:new w3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),keys:[{pubkey:me,isSigner:true,isWritable:false}],data:new TextEncoder().encode('primordial:v1:'+JSON.stringify(memo))}));
  tx.feePayer=me;tx.recentBlockhash=(await conn.getLatestBlockhash()).blockhash;
  toast('Waiting for your wallet.');let sig;try{const r=await pv.signAndSendTransaction(tx);sig=r.signature||r;}catch(e){toast('Cancelled.');return;}
  toast('Confirming on chain.');for(let i=0;i<40;i++){const st=(await conn.getSignatureStatuses([sig])).value[0];if(st&&(st.confirmationStatus==='confirmed'||st.confirmationStatus==='finalized'))break;await new Promise(r=>setTimeout(r,750));}
  const r=await (await fetch('/api/submit',{method:'POST',body:JSON.stringify({sig})})).json();
  if(!r.ok){toast('Not accepted: '+r.error);return;}
  toast(`Entered the log at epoch ${r.event.at}. <a target="_blank" href="${explorer(sig)}">View tx</a>  <a target="_blank" href="${share(evText(r.event),'/e/'+r.event.n)}">Share on X</a>`);loadLedger();}
document.querySelectorAll('[data-ev]').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.ev;if(t==='none')return;const m=Object.assign({t:t==='foodburn'?'food':t},mark?{x:mark[0],y:mark[1]}:{});
  if(t==='foodburn')buy(m,0,CFG.foodBurn);else buy(m,CFG.prices[t],0);}));
$('release').addEventListener('submit',e=>{e.preventDefault();const n=$('spname').value.trim().replace(/[^\w .'-]/g,'').slice(0,24);if(!n)return;buy(Object.assign({t:'release',name:n},mark?{x:mark[0],y:mark[1]}:{}),CFG.prices.release,0);});
// ---------- loop
let frame=0;
function catchUp(){const t0=performance.now();while(W.tick<target&&performance.now()-t0<14)stepOne();}
setInterval(()=>{if(W)catchUp();},33);
function loop(){catchUp();frame++;
  if(qs.get('sp')&&!sel){const id=+qs.get('sp');sel=W.c.find(k=>k.sp===id||W.species[k.sp].root===id)||null;if(sel){drawSpecimen();drawSkill();}}
  if(qs.get('pick')==='released'&&!sel){sel=W.c.find(k=>W.species[W.species[k.sp].root].released)||null;if(sel){drawSpecimen();drawSkill();}}
  if(qs.get('zoom')&&frame===2&&sel){view.z=+qs.get('zoom');view.ox=450-sel.x*view.z;view.oy=450-sel.y*view.z;}
  drawTank();if(frame%3===0){drawBrain();drawSpecimen();}if(frame%30===1){drawTree();drawSkill();}
  if(frame%10===1){$('tick').textContent=W.tick;$('tick2').textContent=W.tick;$('pop').textContent=W.c.length;$('nsp').textContent=W.species.filter(s=>s.count).length;}
  requestAnimationFrame(loop);}
boot();
})();
