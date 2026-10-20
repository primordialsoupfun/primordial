(function(){
'use strict';
const P=window.Primordial,O=window.Organism,$=id=>document.getElementById(id);
const qs=new URLSearchParams(location.search);
const INK='#111314',INK2='#5b554a',RULE='#cbbfa6',RUST='#c9531a',PAPER='#f3eddb';
const MONO='"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace',SERIF='"Iowan Old Style",Palatino,Georgia,serif';
const DPR=Math.min(1.5,window.devicePixelRatio||1);
const tank=$('tank'),tc=tank.getContext('2d'),brain=$('brain'),bc=brain.getContext('2d'),tree=$('tree'),trc=tree.getContext('2d');
for(const c of [tank,brain,tree]){c.dataset.w=c.width;c.dataset.h=c.height;c.width*=DPR;c.height*=DPR;}
const srvHash=new Map();let srvTick=0,srvAt=0;
// Smooth clock: advance at the server rate between heartbeats, never more than 30 ticks ahead of the last heartbeat (events are scheduled 45 ticks ahead).
function predicted(){if(!srvAt)return target;return Math.max(target,Math.min(srvTick+30,srvTick+Math.floor((performance.now()-srvAt)*(CFG.hz||30)/1000)));}
let CFG=null,W=null,evAt=new Map(),target=0,sel=null,mark=null,ledger=null,wallet=null,hashOk=null,lastHash=null;
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
  es.addEventListener('tick',m=>{srvTick=JSON.parse(m.data).t;srvAt=performance.now();});
  es.addEventListener('event',m=>{const e=JSON.parse(m.data);addEv(e);if(e.at<W.tick){setSync('Late event, resyncing',false);resync();}});
  es.addEventListener('hash',m=>{const d=JSON.parse(m.data);srvHash.set(d.t,d.h);checkHash(d.t);});
  es.addEventListener('chain',()=>loadLedger());
  loadLedger();setInterval(loadLedger,10000);
  requestAnimationFrame(loop);
  const dl=qs.get('species');if(dl!=null)setTimeout(()=>locate(+dl,true),300);
}
async function resync(){const s=await (await fetch('/api/snapshot')).json();W=P.World.fromJSON(s.state);evAt=new Map();for(const e of s.events)addEv(e);target=s.serverTick;
  while(W.tick<target)stepOne();window.__world=W;perf.joinMs=performance.now()-T0;perf.joinTicks=target-s.tick;}
const perf=window.__perf={step:0,steps:0,draw:0,draws:0,joinMs:0,frames:0};const T0=performance.now();
const speed={n:0,at:performance.now(),hi:0,ok:0};
function stepOne(){speed.n++;const evs=evAt.get(W.tick)||[];const t=performance.now();W.step(evs);perf.step+=performance.now()-t;perf.steps++;evAt.delete(W.tick-1);
  if(srvHash.has(W.tick))checkHash(W.tick);}
function checkHash(t){if(W.tick!==t||!srvHash.has(t))return;{const h=srvHash.get(t);srvHash.delete(t);const mine=W.hash();hashOk=mine===h;window.__hashes=(window.__hashes||[]).concat([[W.tick,mine,h]]);
  setSync(hashOk?`Live. Your view matches the server, check ${mine} at tick ${W.tick}.`:'Out of step, reloading the tank.',hashOk);if(!hashOk)resync();}}
function setSync(t,ok){const e=$('sync');e.textContent=t;e.className='sync'+(ok?'':' bad');}

// ---------- layers: static plate (redrawn only on zoom/pan) and a food layer refreshed every 8 ticks
const bg=document.createElement('canvas');bg.width=tank.width;bg.height=tank.height;bg.className='bg';tank.parentNode.insertBefore(bg,tank);let bgKey='';
const foodLayer=document.createElement('canvas');foodLayer.width=tank.width;foodLayer.height=tank.height;let foodTick=-99;
// ---------- WebGL point layer for the whole-dish view (organisms as small oriented cells, algae as specks)
const GL=(function(){const cv=document.createElement('canvas');cv.width=tank.width;cv.height=tank.height;cv.className='bg';tank.parentNode.insertBefore(cv,tank);
  const gl=cv.getContext('webgl',{premultipliedAlpha:true,antialias:false,alpha:true});if(!gl){cv.remove();return null;}
  const vs=`attribute vec2 p;attribute float s;attribute vec4 c;attribute float a;uniform vec2 res;varying vec4 vc;varying float va;varying float vk;
  void main(){gl_Position=vec4(p/res*2.0-1.0,0,1);gl_Position.y=-gl_Position.y;gl_PointSize=s;vc=c;va=a;vk=step(0.9,c.a);}`;
  const fs=`precision mediump float;varying vec4 vc;varying float va;varying float vk;
  void main(){vec2 q=gl_PointCoord*2.0-1.0;
    if(vk<0.5){float d=length(q);if(d>1.0)discard;gl_FragColor=vec4(vc.rgb,vc.a*(1.0-smoothstep(.6,1.0,d)))*1.0;gl_FragColor.rgb*=gl_FragColor.a;return;}
    float cs=cos(va),sn=sin(va);vec2 r=vec2(q.x*cs+q.y*sn,-q.x*sn+q.y*cs);vec2 e=r/vec2(0.95,0.58);float d=length(e);if(d>1.0)discard;
    vec3 ink=vc.rgb*0.42;float rim=smoothstep(.62,.92,d);float nuc=1.0-smoothstep(.16,.26,length(r-vec2(.12,0.0)));
    vec3 col=mix(mix(vc.rgb*1.08,vc.rgb,d),ink,rim*.85);col=mix(col,ink,nuc*.7);col=mix(col,vec3(.95,.93,.86),.22*(1.0-rim));float al=.85*(1.0-smoothstep(.92,1.0,d))*(vc.a<0.95?0.35:1.0);gl_FragColor=vec4(col*al,al);}`;
  const sh=(t,src)=>{const o=gl.createShader(t);gl.shaderSource(o,src);gl.compileShader(o);return o;};
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){cv.remove();return null;}
  gl.useProgram(pr);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);const ST=8*4;
  const at=(n,sz,off)=>{const l=gl.getAttribLocation(pr,n);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,sz,gl.FLOAT,false,ST,off);};
  at('p',2,0);at('s',1,8);at('c',4,12);at('a',1,28);const ures=gl.getUniformLocation(pr,'res');
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);let data=new Float32Array(8*3000);let shown=false;
  function draw(W,view){const n=W.food.length+W.c.length;if(data.length<n*8)data=new Float32Array(n*8*1.5|0);let j=0;const k=DPR,Z=view.z;
    for(const f of W.food){data[j++]=(f.x*Z+view.ox)*k;data[j++]=(f.y*Z+view.oy)*k;data[j++]=2.6*k*Math.sqrt(Z);data[j++]=96/255;data[j++]=112/255;data[j++]=62/255;data[j++]=.55;data[j++]=-1;}
    const S=W.species;for(const o of W.c){const col=S[o.sp].col,sz=(2.4+Math.min(1.6,o.e*.8))*2.5*Z*k;data[j++]=(o.x*Z+view.ox)*k;data[j++]=(o.y*Z+view.oy)*k;data[j++]=sz;data[j++]=col[0]/255;data[j++]=col[1]/255;data[j++]=col[2]/255;data[j++]=dimOf(o);data[j++]=Math.atan2(o.dy,o.dx);}
    gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(ures,cv.width,cv.height);
    gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,j),gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,j/8);shown=true;cv.style.visibility='visible';}
  function hide(){if(shown){gl.clear(gl.COLOR_BUFFER_BIT);cv.style.visibility='hidden';shown=false;}}
  return {draw,hide};})();
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

// ---------- sprite caches (visual only). Organisms are pre-drawn per species, traits, size, zoom bucket and 4 swim phases.
const SPR=new Map();let sprZ=0;
function zBucket(z){return z;}
const LEVELS=[3,4.5,6.75,10,14];function snapZ(z){let b=LEVELS[0];for(const l of LEVELS)if(Math.abs(Math.log(l/z))<Math.abs(Math.log(b/z)))b=l;return b;}
function sprite(sp,root,size,z,ph,ang){const zb=z;
  const key=zb+'|'+sp.id+'|'+sp.traits.join(',')+'|'+size+'|'+ph+'|'+ang;let e=SPR.get(key);if(e)return e;
  const k=zb*DPR,half=Math.ceil(size*4.2*k)+2,cv=document.createElement('canvas');cv.width=cv.height=half*2;const c=cv.getContext('2d');
  const a=ang*Math.PI/8;c.setTransform(k,0,0,k,half,half);O.draw(c,{x:0,y:0,dx:Math.cos(a),dy:Math.sin(a),id:ph*5,v:.8},sp,root,size,zb,ph*6,1);
  e={cv,half,k};if(SPR.size>20000)SPR.clear();SPR.set(key,e);return e;}
const ALG=new Map();
function algaeSprite(t,rot,z){const zb=zBucket(z),key=t+'|'+rot+'|'+zb;let e=ALG.get(key);if(e)return e;
  const k=zb*DPR,half=Math.ceil(3*k)+2,cv=document.createElement('canvas');cv.width=cv.height=half*2;const c=cv.getContext('2d');c.setTransform(k,0,0,k,half,half);
  O.algae(c,{x:0,y:0},t+rot*3,zb);e={cv,half,k};ALG.set(key,e);return e;}
// ---------- tank render
function drawTank(){
  const c=tc;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,900,900);
  const vk=view.z+','+view.ox+','+view.oy;if(vk!==bgKey){bgKey=vk;const b=bg.getContext('2d');b.setTransform(DPR,0,0,DPR,0,0);b.clearRect(0,0,900,900);b.save();b.translate(view.ox,view.oy);b.scale(view.z,view.z);b.drawImage(plate,0,0,900,900);b.restore();foodTick=-99;}
  c.save();c.translate(view.ox,view.oy);c.scale(view.z,view.z);
  c.beginPath();c.arc(P.CX,P.CY,P.R,0,7);c.clip();
  const z=view.z*(tank.clientWidth/900||1);
  // thermal vents: concentric fine rings
  for(const v of W.vents){c.strokeStyle='rgba(201,83,26,.18)';c.lineWidth=.5/view.z;for(let r=10;r<=50;r+=10){c.beginPath();c.arc(v[0],v[1],r,0,7);c.stroke();}
    }
  drawZones(c);
  if(W.cold>0){const a=Math.min(1,W.cold/120,(700-W.cold)/40+.2);c.fillStyle=`rgba(78,96,108,${.1*a})`;c.fillRect(0,0,900,900);c.globalAlpha=a;c.drawImage(frost,0,0,900,900);c.globalAlpha=1;}
  for(const t of W.toxic){c.strokeStyle='rgba(201,83,26,.32)';c.lineWidth=.6/view.z;c.save();c.beginPath();c.arc(t.x,t.y,t.r,0,7);c.clip();
    for(let x=-t.r;x<t.r;x+=7){c.beginPath();c.moveTo(t.x+x,t.y-t.r);c.lineTo(t.x+x+t.r,t.y+t.r);c.stroke();}c.restore();
    c.setLineDash([3,3]);c.strokeStyle=RUST;c.beginPath();c.arc(t.x,t.y,t.r,0,7);c.stroke();c.setLineDash([]);
    c.fillStyle=RUST;c.font=`italic ${12/view.z}px ${SERIF}`;c.textAlign='center';c.fillText('toxic bloom',t.x,t.y-t.r-6/view.z);}
  for(const k of W.craters){const age=W.tick-k.t;if(age>2400)continue;const a=1-age/2400;
    if(age<120){const q=age/120,e=1-(1-q)*(1-q);c.strokeStyle=`rgba(17,19,20,${.7*(1-q)})`;for(let i=0;i<3;i++){c.lineWidth=(2.2-i*.6)/view.z;c.beginPath();c.arc(k.x,k.y,k.r*(e*(1-i*.18)),0,7);c.stroke();}
      c.fillStyle=`rgba(201,83,26,${.22*(1-q)})`;c.beginPath();c.arc(k.x,k.y,k.r*e*.55,0,7);c.fill();}
    c.strokeStyle=`rgba(17,19,20,${.5*a})`;c.lineWidth=.7/view.z;c.setLineDash([1,3]);c.beginPath();c.arc(k.x,k.y,k.r,0,7);c.stroke();c.setLineDash([]);
    c.fillStyle=`rgba(17,19,20,${.55*a})`;c.font=`italic ${12/view.z}px ${SERIF}`;c.textAlign='center';c.fillText('impact, epoch '+k.t,k.x,k.y-k.r-6/view.z);}
  const vis=(x,y,m)=>{const sx=x*view.z+view.ox,sy=y*view.z+view.oy;return sx>-m&&sx<900+m&&sy>-m&&sy<900+m;};
  const S=W.species,DETAIL=view.z>=3;
  if(!DETAIL&&GL){GL.draw(W,view,z);}
  else{if(GL)GL.hide();
  if(W.tick-foodTick>=8||W.tick<foodTick){foodTick=W.tick;const fc=foodLayer.getContext('2d');fc.setTransform(DPR,0,0,DPR,0,0);fc.clearRect(0,0,900,900);fc.save();fc.translate(view.ox,view.oy);fc.scale(view.z,view.z);
    for(let i=0;i<W.food.length;i++){const f=W.food[i];if(!vis(f.x,f.y,10))continue;if(!DETAIL){fc.fillStyle='rgba(96,112,62,.6)';fc.fillRect(f.x-1,f.y-1,2,2);continue;}const a=algaeSprite(i%3,(i*7)%8,z);fc.drawImage(a.cv,f.x-a.half/a.k,f.y-a.half/a.k,a.cv.width/a.k,a.cv.height/a.k);}fc.restore();}
  c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(foodLayer,0,0);c.restore();
  const ops=[];c.beginPath();const L=snapZ(view.z),sc=view.z/L;
  for(const k of W.c){if(!vis(k.x,k.y,30))continue;const sp=S[k.sp];
    if(!DETAIL){ops.push(null,k.x,k.y,sp.col);continue;}
    let tr=trails.get(k.id);if(!tr){tr=[];trails.set(k.id,tr);}if((W.tick&3)===0){tr.push(k.x,k.y);if(tr.length>18)tr.splice(0,2);}
    if(tr.length>=4){c.moveTo(tr[0],tr[1]);for(let i=2;i<tr.length;i+=2)c.lineTo(tr[i],tr[i+1]);c.lineTo(k.x,k.y);}
    const size=2.4+Math.round(Math.min(1.6,k.e*.8)/.8)*.8,ph=((W.tick>>3)+k.id)&1,ang=(Math.round(Math.atan2(k.dy,k.dx)/(Math.PI/8))+16)&15,spr=sprite(sp,S[sp.root],size,L,ph,ang);
    ops.push(spr,(k.x*view.z+view.ox)*DPR,(k.y*view.z+view.oy)*DPR,dimOf(k)<0.95?0.35:1);}
  if(DETAIL){c.strokeStyle='rgba(90,80,64,.16)';c.lineWidth=.6/view.z;c.stroke();}
  c.save();c.setTransform(1,0,0,1,0,0);
  for(let i=0;i<ops.length;i+=4){const o=ops[i];if(!o){const col=ops[i+3];c.fillStyle=`rgb(${col[0]},${col[1]},${col[2]})`;c.fillRect((ops[i+1]*view.z+view.ox)*DPR-2,(ops[i+2]*view.z+view.oy)*DPR-1.5,4,3);continue;}
    const w=o.cv.width*sc,h=o.cv.height*sc;c.globalAlpha=ops[i+3]||1;c.drawImage(o.cv,ops[i+1]-w/2,ops[i+2]-h/2,w,h);}c.globalAlpha=1;
  c.restore();}
  if(W.tick%200===0){const alive=new Set(W.c.map(k=>k.id));for(const id of trails.keys())if(!alive.has(id))trails.delete(id);}
  drawHighlights(c);
  if(mark){c.strokeStyle=RUST;c.lineWidth=.8/view.z;const m=8/view.z;c.beginPath();c.moveTo(mark[0]-m,mark[1]);c.lineTo(mark[0]+m,mark[1]);c.moveTo(mark[0],mark[1]-m);c.lineTo(mark[0],mark[1]+m);c.stroke();
    c.beginPath();c.arc(mark[0],mark[1],m*1.6,0,7);c.stroke();c.fillStyle=RUST;c.font=`italic ${12/view.z}px ${SERIF}`;c.textAlign='left';c.fillText('your mark',mark[0]+m*2,mark[1]+4/view.z);}
  if(sel&&W.c.includes(sel)){const s=1/view.z;c.strokeStyle=INK;c.lineWidth=.8*s;c.beginPath();c.arc(sel.x,sel.y,16*s,0,7);c.stroke();
    c.beginPath();c.moveTo(sel.x+11*s,sel.y-11*s);c.lineTo(sel.x+40*s,sel.y-40*s);c.lineTo(sel.x+130*s,sel.y-40*s);c.stroke();
    c.fillStyle=INK;c.font=`italic ${13*s}px ${SERIF}`;c.textAlign='left';c.fillText(spName(S[sel.sp]),sel.x+44*s,sel.y-45*s);}
  c.restore();
}
// ---------- frost texture (drawn once): hand-cut ice crystals creeping in from the rim
const frost=document.createElement('canvas');frost.width=900;frost.height=900;
(function(){const c=frost.getContext('2d'),{CX,CY,R}=P;let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;c.strokeStyle='rgba(58,78,92,.55)';c.lineCap='round';
  for(let i=0;i<150;i++){const a=rnd()*6.283,d=R-rnd()*rnd()*120,x=CX+Math.cos(a)*d,y=CY+Math.sin(a)*d,l=3+rnd()*9;c.lineWidth=.5+rnd()*.6;
    for(let j=0;j<3;j++){const b=a+j*1.047+rnd()*.2;c.beginPath();c.moveTo(x-Math.cos(b)*l,y-Math.sin(b)*l);c.lineTo(x+Math.cos(b)*l,y+Math.sin(b)*l);c.stroke();}}})();
// ---------- territory: zone outlines, holder banners, ink spread on capture
const capture=new Map();
function holderName(h){return h<0?'unclaimed':spName(W.species[h]);}
function drawZones(c){if(!W.pvp)return;if(W.pvp.v===2)return drawZones2(c);const s=(view.z<2?1.6:1)/view.z,now=performance.now();
  for(const z of W.pvp.zones){const prev=capture.get(z.name);if(!prev)capture.set(z.name,{h:z.h,at:0});else if(prev.h!==z.h){prev.h=z.h;prev.at=now;}
    const cp=capture.get(z.name),q=cp.at?Math.min(1,(now-cp.at)/1400):1,col=z.h>=0?W.species[z.h].col:[91,85,74],mine=z.h>=0&&W.species[z.h].released;
    if(q<1){const e=1-Math.pow(1-q,3);c.fillStyle=`rgba(${col},${.28*(1-q)})`;c.beginPath();for(let i=0;i<=24;i++){const a=i/24*6.283,w=1+.07*Math.sin(i*2.7+z.x);c.lineTo(z.x+Math.cos(a)*z.r*e*w,z.y+Math.sin(a)*z.r*e*w);}c.fill();}
    c.strokeStyle=mine?'rgba(201,83,26,.7)':'rgba(17,19,20,.32)';c.lineWidth=(mine?1:.7)*s;c.setLineDash([4*s,4*s]);c.beginPath();c.arc(z.x,z.y,z.r,0,7);c.stroke();c.setLineDash([]);
    const bx=z.x-6*s,by=z.y-z.r*.42+11*s;c.strokeStyle=INK;c.lineWidth=.9*s;c.beginPath();c.moveTo(bx,by);c.lineTo(bx,by-22*s);c.stroke();
    c.fillStyle=z.h>=0?`rgb(${col})`:PAPER;c.beginPath();c.moveTo(bx,by-22*s);c.lineTo(bx+16*s,by-18.5*s);c.lineTo(bx+11*s,by-15*s);c.lineTo(bx+16*s,by-11.5*s);c.lineTo(bx,by-11*s);c.closePath();c.fill();c.stroke();
    c.font=`italic ${10.5*s}px ${SERIF}`;const tw=Math.max(c.measureText(z.h>=0?holderName(z.h):'unclaimed').width,z.name.length*5.6*s)+10*s;c.fillStyle='rgba(243,237,219,.78)';c.fillRect(z.x-tw/2,by+3*s,tw,25*s);
    c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle=INK;c.font=`${8.5*s}px ${MONO}`;c.fillText(z.name.toUpperCase(),z.x,by+12*s);
    c.fillStyle=mine?RUST:INK2;c.font=`italic ${10.5*s}px ${SERIF}`;c.fillText(z.h>=0?holderName(z.h):'unclaimed',z.x,by+24*s);}}
// ---------- territory v2: pre-rendered land map (borders once, tint on holder change), cartographic labels, waving pennants
const ZL={key:'',fine:null,border:null,tint:null,tintKey:'',spread:new Map()};const FS=3,FN=300;
function zoneMaps(){const z=W.pvp.zones,key=W.seed+':'+z.map(q=>q.name).join();if(ZL.key===key)return;ZL.key=key;ZL.tintKey='';
  const F=new Uint8Array(FN*FN);for(let y=0;y<FN;y++)for(let x=0;x<FN;x++)F[y*FN+x]=W.zoneAtPoint(x*FS+1,y*FS+1,z);ZL.fine=F;
  const b=document.createElement('canvas');b.width=b.height=1800;const c=b.getContext('2d');c.scale(2,2);c.lineCap='round';
  let s=11;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
  for(const [col,w] of [['rgba(17,19,20,.16)',3.2],['rgba(17,19,20,.62)',.9]]){c.strokeStyle=col;c.lineWidth=w;c.beginPath();
    for(let y=0;y<FN-1;y++)for(let x=0;x<FN-1;x++){const a=F[y*FN+x];if(a===255)continue;const r=F[y*FN+x+1],d=F[(y+1)*FN+x];const j=()=>(rnd()-.5)*.8;
      if(r!==a&&r!==255){c.moveTo((x+1)*FS+j(),y*FS+j());c.lineTo((x+1)*FS+j(),(y+1)*FS+j());}
      if(d!==a&&d!==255){c.moveTo(x*FS+j(),(y+1)*FS+j());c.lineTo((x+1)*FS+j(),(y+1)*FS+j());}}c.stroke();}
  ZL.border=b;}
function zoneTint(){const z=W.pvp.zones,key=z.map(q=>q.h).join();if(ZL.tintKey===key)return;ZL.tintKey=key;
  const cv=ZL.tint||(ZL.tint=document.createElement('canvas'));cv.width=cv.height=FN;const c=cv.getContext('2d'),im=c.createImageData(FN,FN),F=ZL.fine;
  for(let i=0;i<F.length;i++){const q=F[i];if(q===255)continue;const Z=z[q];if(Z.h<0)continue;const col=W.species[Z.h].col,hatch=((i%FN)+((i/FN)|0))%6<2;
    im.data[i*4]=col[0];im.data[i*4+1]=col[1];im.data[i*4+2]=col[2];im.data[i*4+3]=hatch?46:20;}c.putImageData(im,0,0);}
function zoneMask(q,col){const cv=document.createElement('canvas');cv.width=cv.height=FN;const c=cv.getContext('2d'),im=c.createImageData(FN,FN),F=ZL.fine;
  for(let i=0;i<F.length;i++)if(F[i]===q){im.data[i*4]=col[0];im.data[i*4+1]=col[1];im.data[i*4+2]=col[2];im.data[i*4+3]=150;}c.putImageData(im,0,0);return cv;}
function drawZones2(c){zoneMaps();zoneTint();const Z=W.pvp.zones,now=performance.now(),s=(view.z<2?1.5:1)/view.z;
  c.imageSmoothingEnabled=true;c.drawImage(ZL.tint,0,0,900,900);
  Z.forEach((z,i)=>{const p=capture.get(z.name);if(!p)capture.set(z.name,{h:z.h,at:0});else if(p.h!==z.h){p.h=z.h;p.at=now;if(z.h>=0)ZL.spread.set(i,zoneMask(i,W.species[z.h].col));}
    const cp=capture.get(z.name),m=ZL.spread.get(i);if(m&&cp.at){const q=Math.min(1,(now-cp.at)/1600);if(q>=1){ZL.spread.delete(i);return;}const e=1-Math.pow(1-q,3);
      c.save();c.beginPath();for(let k=0;k<=28;k++){const a=k/28*6.283,w=1+.12*Math.sin(k*2.3+i);c.lineTo(z.cx+Math.cos(a)*260*e*w,z.cy+Math.sin(a)*260*e*w);}c.clip();c.globalAlpha=.9*(1-q*q);c.drawImage(m,0,0,900,900);c.restore();c.globalAlpha=1;}});
  c.drawImage(ZL.border,0,0,900,900);
  // labels
  c.textAlign='center';c.textBaseline='alphabetic';
  Z.forEach((z,i)=>{const held=z.h>=0,col=held?W.species[z.h].col:null,x=z.cx,y=z.cy,mine=held&&W.species[z.h].released;
    c.font=`${10*s}px ${SERIF}`;if('letterSpacing' in c)c.letterSpacing=`${2.2*s}px`;const nm=z.name.toUpperCase();const tw=c.measureText(nm).width;
    c.fillStyle='rgba(243,237,219,.72)';c.fillRect(x-tw/2-5*s,y+2*s,tw+10*s,held?28*s:16*s);
    c.fillStyle=INK;c.fillText(nm,x,y+13*s);if('letterSpacing' in c)c.letterSpacing='0px';
    if(held){c.font=`italic ${10.5*s}px ${SERIF}`;c.fillStyle=mine?RUST:INK2;c.fillText(holderName(z.h),x,y+26*s);}
    // pole and pennant
    const px=x,py=y-2*s,top=py-26*s;c.strokeStyle=INK;c.lineWidth=1*s;c.beginPath();c.moveTo(px,py);c.lineTo(px,top);c.stroke();c.fillStyle=INK;c.beginPath();c.arc(px,top,1.4*s,0,7);c.fill();
    if(held){const t=now/700+i*1.7,w1=Math.sin(t)*2.2*s,w2=Math.sin(t+1.3)*2.6*s;
      c.fillStyle=`rgb(${col})`;c.beginPath();c.moveTo(px,top+1*s);c.quadraticCurveTo(px+9*s,top-1*s+w1,px+19*s,top+3*s+w2);c.lineTo(px+13*s,top+7.5*s+w2*.6);c.lineTo(px+19*s,top+12*s+w2);c.quadraticCurveTo(px+9*s,top+9*s+w1,px,top+12*s);c.closePath();c.fill();
      c.strokeStyle=INK;c.lineWidth=.8*s;c.stroke();
      c.strokeStyle='rgba(17,19,20,.35)';c.lineWidth=.5*s;c.beginPath();c.moveTo(px+3*s,top+4*s+w1*.4);c.lineTo(px+12*s,top+5*s+w1*.8);c.moveTo(px+3*s,top+8.5*s+w1*.4);c.lineTo(px+11*s,top+9.5*s+w1*.8);c.stroke();}});}
// zone card on hover or tap
function zoneCard(sx,sy,wx,wy){const el=$('zcard');if(!W.pvp||W.pvp.v!==2){el.hidden=true;return;}const q=W.zoneIndex(wx,wy);if(q===255){el.hidden=true;return;}
  const z=W.pvp.zones[q],held=z.h>=0;el.innerHTML=`<p class="zk">Zone</p><h3></h3><p class="zh"></p><p class="zr">The lineage with the most living mass here holds this zone and flies its flag. A rival needs 15 percent more to take it.</p>`;
  el.querySelector('h3').textContent=z.name;el.querySelector('.zh').textContent=held?`Held by ${holderName(z.h)} since tick ${z.since}.`:'Unclaimed. The first lineage to settle here takes it.';
  const r=tank.getBoundingClientRect(),k=r.width/900;el.hidden=false;const L=Math.min(r.width-el.offsetWidth-8,Math.max(8,sx*k+14)),T=Math.max(8,Math.min(r.height-el.offsetHeight-8,sy*k+14));el.style.left=L+'px';el.style.top=T+'px';}
tank.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||ptrs.size)return;const[x,y,sx,sy]=toWorld(e);zoneCard(sx,sy,x,y);});
tank.addEventListener('pointerleave',()=>{$('zcard').hidden=true;});
// ---------- battle feed
function feedText(e){const n=id=>`<i>${esc(holderName(id))}</i>`;
  if(e.k==='zone')return `${n(e.a)} took the ${e.z}${e.b>=0?' from '+n(e.b):''}.`;
  if(e.k==='lost')return `${n(e.a)} lost the ${e.z}. It is unclaimed.`;
  if(e.k==='hunt')return `${n(e.a)} hunted ${e.n} of ${n(e.b)}.`;
  if(e.k==='season')return `Season ${e.n} began. Hunting tallies reset.`;return '';}
const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
let feedKey='';function drawFeed(){const ol=$('feed');if(!ol||!W)return;const f=W.pvp?W.pvp.feed:[],key=f.length+':'+(f.length?f[f.length-1].t:0);if(key===feedKey)return;
  const fresh=feedKey!=='';feedKey=key;ol.innerHTML='';
  for(const e of f.slice(-12).reverse()){const li=document.createElement('li');li.className='fe '+e.k;li.innerHTML=`<b>${String(e.t).padStart(6,'0')}</b><span>${feedText(e)}</span>`;ol.append(li);}
  if(fresh&&ol.firstChild)ol.firstChild.classList.add('new');
  if(!f.length)ol.innerHTML=`<li class="muted">${W.pvp?'Quiet so far. Zone captures and hunts appear here as they happen.':'Territory opens at tick '+(W.cfg.pvpFrom||0)+'.'}</li>`;}
// ---------- lineages: follow list, locate, track camera, highlights, off-screen ticks, search
const FKEY='primordial.follows';let follows=new Set(JSON.parse(localStorage.getItem(FKEY)||'[]'));let selLine=null;const hist=new Map();
const cam={goal:null,track:null,trackLine:null};
// Lineage key: a released species groups all its descendants; a wild species stands alone.
const lineOf=id=>{const s=W.species[id];return W.species[s.root].released?s.root:s.id;};const rootOf=k=>lineOf(k.sp);
function myLines(){const out=new Set();if(wallet)for(const s of W.species)if(s.released&&s.root===s.id&&s.owner===wallet)out.add(s.id);for(const f of follows)out.add(f);return [...out].filter(id=>W.species[id]);}
function dimOf(k){return selLine!=null&&rootOf(k)!==selLine?0.92:1;}
function members(root){const a=[];for(const k of W.c)if(rootOf(k)===root)a.push(k);return a;}
function cluster(ms){if(!ms.length)return null;const B=new Map();let best=null,bn=0;for(const k of ms){const key=((k.x/60)|0)+','+((k.y/60)|0);const v=(B.get(key)||0)+1;B.set(key,v);if(v>bn){bn=v;best=key;}}
  const[bx,by]=best.split(',').map(Number);let sx=0,sy=0,n=0;for(const k of ms)if(Math.abs(k.x/60-bx-.5)<1.5&&Math.abs(k.y/60-by-.5)<1.5){sx+=k.x;sy+=k.y;n++;}return{x:sx/n,y:sy/n,n};}
function goTo(x,y,z){cam.goal={x,y,z:Math.max(1,Math.min(14,z))};}
function camStep(){
  if(cam.track){let k=W.c.includes(cam.track)?cam.track:null;
    if(!k){const ms=members(cam.trackLine);if(!ms.length){stopTrack('The tracked lineage has died out.');}else{const p=cam.last||ms[0];ms.sort((a,b)=>((a.x-p.x)**2+(a.y-p.y)**2)-((b.x-p.x)**2+(b.y-p.y)**2));cam.track=k=ms[0];sel=k;notice(`Tracked organism died. Now following no. ${k.id}.`);}}
    if(k){cam.last={x:k.x,y:k.y};cam.goal={x:k.x,y:k.y,z:Math.max(view.z,(cam.goal&&cam.goal.z)||4)};}}
  const g=cam.goal;if(!g)return;const cx=(450-view.ox)/view.z,cy=(450-view.oy)/view.z,f=cam.track?.18:.09;
  const nz=view.z+(g.z-view.z)*f,nx=cx+(g.x-cx)*f,ny=cy+(g.y-cy)*f;view.z=nz;view.ox=450-nx*nz;view.oy=450-ny*nz;
  if(!cam.track&&Math.abs(g.z-nz)<.01&&Math.abs(g.x-nx)<.3&&Math.abs(g.y-ny)<.3)cam.goal=null;}
function locate(id,select){const S=W.species[id];if(!S){notice('No species with that number.');return;}const root=lineOf(id),ms=members(root);selLine=root;
  if(!ms.length){notice(`${spName(W.species[root])} has no living members.`);return;}const c=cluster(ms);goTo(c.x,c.y,c.n>12?3.4:5);
  if(select||!sel||rootOf(sel)!==root){sel=ms.reduce((a,b)=>(a.x-c.x)**2+(a.y-c.y)**2<(b.x-c.x)**2+(b.y-c.y)**2?a:b);drawSpecimen();drawSkill();}drawLines();}
function track(id){const root=lineOf(id),ms=members(root);if(!ms.length){notice('No living members to track.');return;}selLine=root;cam.trackLine=root;cam.track=(sel&&rootOf(sel)===root&&W.c.includes(sel))?sel:ms.reduce((a,b)=>a.age>b.age?a:b);sel=cam.track;notice(`Tracking no. ${cam.track.id}. Press Esc or drag to stop.`);drawSpecimen();drawSkill();}
function stopTrack(msg){cam.track=null;cam.goal=null;if(msg)notice(msg);}
function toggleFollow(id){const r=lineOf(id);follows.has(r)?follows.delete(r):follows.add(r);localStorage.setItem(FKEY,JSON.stringify([...follows]));drawLines();drawSpecimen();}
function notice(t){const e=$('camnote');e.textContent=t;e.hidden=false;clearTimeout(notice.t);notice.t=setTimeout(()=>e.hidden=true,4000);}
function drawHighlights(c){const lines=new Set(myLines());if(selLine!=null)lines.add(selLine);if(!lines.size)return;const s=1/view.z;
  c.strokeStyle=RUST;c.lineWidth=.9*s;c.beginPath();let n=0;const labels=new Map();
  for(const k of W.c){const r=rootOf(k);if(!lines.has(r))continue;const sx=k.x*view.z+view.ox,sy=k.y*view.z+view.oy;if(sx<-20||sx>920||sy<-20||sy>920)continue;
    if(n++<400){const rr=(view.z>=3?7:5)*s;c.moveTo(k.x+rr,k.y);c.arc(k.x,k.y,rr,0,6.283);}if(!labels.has(r))labels.set(r,k);}
  c.stroke();c.fillStyle=RUST;c.font=`italic ${11*s}px ${SERIF}`;c.textAlign='left';for(const [r,k] of labels)c.fillText(spName(W.species[r]),k.x+9*s,k.y-7*s);
  // off-screen ticks: linocut-style double ticks on the visible rim pointing toward lineages out of view
  c.save();c.setTransform(DPR,0,0,DPR,0,0);c.strokeStyle=RUST;c.fillStyle=RUST;c.lineWidth=1.4;c.font=`10px ${MONO}`;
  for(const r of lines){if(labels.has(r))continue;const ms=members(r);if(!ms.length)continue;const cl=cluster(ms),tx=cl.x*view.z+view.ox,ty=cl.y*view.z+view.oy;
    let dx=tx-450,dy=ty-450;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;let rr=Math.min(436,P.R*view.z);let ex=450+dx*rr,ey=450+dy*rr;
    const m=16;ex=Math.max(m,Math.min(900-m,ex));ey=Math.max(m,Math.min(900-m,ey));
    c.beginPath();for(const o of [-4,4]){c.moveTo(ex-dy*o-dx*10,ey+dx*o-dy*10);c.lineTo(ex-dy*o,ey+dx*o);}c.moveTo(ex-dx*14,ey-dy*14);c.lineTo(ex+dx*2,ey+dy*2);c.stroke();
    c.textAlign=dx>0?'right':'left';c.fillText(spName(W.species[r]).toUpperCase(),ex-dx*20,ey-dy*20+3);}
  c.restore();}
function trend(r,alive){const h=hist.get(r)||[];const now=W.tick;if(!h.length||now-h[h.length-1][0]>300){h.push([now,alive]);if(h.length>8)h.shift();hist.set(r,h);}
  const d=alive-h[0][1];return d>2?'+'+d:d<-2?String(d):'steady';}
const STAR='<svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path d="M10 2.2l2.3 5 5.4.5-4.1 3.6 1.2 5.3L10 13.9l-4.8 2.7 1.2-5.3-4.1-3.6 5.4-.5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
function row(id,mineFlag){const S=W.species[id],st=lineStats(id),li=document.createElement('li');li.className='lrow'+(selLine===id?' on':'');
  li.innerHTML=`<span class="nm"></span><span class="sc">${st.alive} alive, gen ${st.maxGen}, ${trend(id,st.alive)}${mineFlag?', yours':''}</span><span class="est">${estimate(id)}</span><span class="btns"><button class="lk">Locate</button><button class="tr">Track</button><button class="st${follows.has(id)?' on':''}" title="Follow">${STAR}</button></span>`;
  li.querySelector('.nm').textContent=spName(S)+'  no. '+id;li.querySelector('.lk').onclick=()=>locate(id);li.querySelector('.tr').onclick=()=>track(id);li.querySelector('.st').onclick=()=>toggleFollow(id);return li;}
// Earnings estimate from the server: this hour's projected share of the yield budget, plus what the lineage has earned so far.
function estimate(id){const E=ledger&&ledger.eco;if(!E)return '';const sol=l=>(l/1e9).toFixed(4)+' SOL',usd=l=>'$'+(l/1e9*E.solUsd).toFixed(2);
  const est=E.est[id]||0,got=E.earned[id]||0;if(!est&&!got)return W.species[id]&&W.species[id].released?'Earns once it has been alive for part of an hour':'Wild lineage, earns nothing';
  return `This hour, about ${usd(est)} (${sol(est)}). Earned so far ${usd(got)}.${E.free[id]?' Free release, earns a quarter.':''}`;}
function estimateOld(id){const sc=W.scores(),me=sc.findIndex(x=>x.sp===id);if(me<0||me>2)return 'Est. earnings: none yet, not in the top three';const pool=(ledger&&ledger.pool||0)/1e9,sh=CFG.cfg.split[me],hrs=CFG.cfg.epochTicks/(CFG.hz||30)/3600;return `Est. earnings, placeholder: about ${(pool*sh/hrs).toFixed(4)} SOL per hour if it keeps place ${me+1}`;}
function lineStats(id){let alive=0,maxGen=0;for(const k of W.c)if(rootOf(k)===id){alive++;if(k.gen>maxGen)maxGen=k.gen;}return{alive,maxGen};}
function drawLines(){const ol=$('mylines');if(!ol||!W)return;ol.innerHTML='';const mine=new Set();if(wallet)for(const s of W.species)if(s.released&&s.root===s.id&&s.owner===wallet)mine.add(s.id);
  const ids=myLines();for(const id of ids)ol.append(row(id,mine.has(id)));
  if(!ids.length)ol.innerHTML='<li class="muted">Nothing here yet. Release a creature and it shows up here. You can also click any creature in the tank and press Follow lineage to keep an eye on it.</li>';
  const q=$('lsearch').value.trim().toLowerCase(),res=$('lresults');res.innerHTML='';if(!q)return;
  const hits=[];for(const s of W.species){if(lineOf(s.id)!==s.id)continue;const nm=spName(s).toLowerCase();if(String(s.id)===q||nm.includes(q)){if(s.count>0||(s.released&&lineStats(s.id).alive>0))hits.push(s.id);}if(hits.length>=6)break;}
  for(const id of hits)res.append(row(id,mine.has(id)));if(!hits.length)res.innerHTML='<li class="muted">No living lineage matches.</li>';}
$('lsearch').addEventListener('input',()=>drawLines());
$('lsearch').addEventListener('keydown',e=>{if(e.key==='Enter'){const f=$('lresults').querySelector('.lk');if(f)f.click();}});
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='Escape'){stopTrack();selLine=null;}
  if(e.key==='f'||e.key==='F'){const ids=myLines();if(!ids.length){notice('Your lineage list is empty.');return;}const i=(ids.indexOf(selLine)+1)%ids.length;locate(ids[i]);}});
$('starsp').onclick=()=>{if(sel)toggleFollow(sel.sp);};
// ---------- zoom / pan / pick
const toWorld=(e)=>{const r=tank.getBoundingClientRect(),sx=(e.clientX-r.left)*900/r.width,sy=(e.clientY-r.top)*900/r.height;return[(sx-view.ox)/view.z,(sy-view.oy)/view.z,sx,sy];};
function zoomAt(f,sx,sy){const nz=Math.max(1,Math.min(14,view.z*f));view.ox=sx-(sx-view.ox)*nz/view.z;view.oy=sy-(sy-view.oy)*nz/view.z;view.z=nz;if(nz===1){view.ox=0;view.oy=0;}}
tank.addEventListener('wheel',e=>{e.preventDefault();cam.goal=null;const[, ,sx,sy]=toWorld(e);zoomAt(Math.exp(-Math.max(-60,Math.min(60,e.deltaY))*.004),sx,sy);hintSeen();},{passive:false});
$('zin').onclick=()=>zoomSmooth(1.5,450,450);$('zout').onclick=()=>zoomSmooth(1/1.5,450,450);$('zreset').onclick=()=>{stopTrack();goTo(450,450,1);};
// Pointer input: one finger or mouse drags, two fingers pinch, tap picks, double tap or double click zooms in at the point.
const ptrs=new Map();let drag=null,pinch=null,lastTap={t:0,x:0,y:0};
const scr=e=>{const r=tank.getBoundingClientRect();return[(e.clientX-r.left)*900/r.width,(e.clientY-r.top)*900/r.height];};
function hintSeen(){if(!localStorage.getItem('primordial.zoomhint')){localStorage.setItem('primordial.zoomhint','1');const h=$('zhint');if(h)h.classList.add('gone');}}
tank.addEventListener('pointerdown',e=>{tank.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,scr(e));
  if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,ox:view.ox,oy:view.oy,moved:false};
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1])||1,z:view.z};drag=null;cam.goal=null;}});
tank.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,scr(e));
  if(pinch&&ptrs.size>=2){const [a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;zoomAt(pinch.z*d/pinch.d/view.z,mx,my);hintSeen();return;}
  if(!drag)return;const r=tank.getBoundingClientRect(),k=900/r.width,dx=(e.clientX-drag.x)*k,dy=(e.clientY-drag.y)*k;
  if(Math.abs(dx)+Math.abs(dy)>(e.pointerType==='touch'?10:4))drag.moved=true;
  if(drag.moved){if(cam.track)stopTrack('Tracking stopped.');cam.goal=null;if(view.z>1){view.ox=drag.ox+dx;view.oy=drag.oy+dy;hintSeen();}}});
function endPtr(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
  if(pinch){if(ptrs.size<2)pinch=null;drag=null;return;}
  if(drag&&!drag.moved&&e.type==='pointerup'){const now=performance.now(),[sx,sy]=scr(e);
    if(now-lastTap.t<320&&Math.hypot(sx-lastTap.x,sy-lastTap.y)<40){lastTap.t=0;clearTimeout(endPtr.t);zoomSmooth(2,sx,sy);hintSeen();}
    else{lastTap={t:now,x:sx,y:sy};const ev={clientX:e.clientX,clientY:e.clientY},touch=e.pointerType!=='mouse';clearTimeout(endPtr.t);endPtr.t=setTimeout(()=>{if(lastTap.t!==now)return;pick(ev);if(touch){const[x,y,a,b]=toWorld(ev);zoneCard(a,b,x,y);}},300);}}
  drag=null;}
tank.addEventListener('pointerup',endPtr);tank.addEventListener('pointercancel',endPtr);
tank.addEventListener('dblclick',e=>e.preventDefault());
// eased zoom toward a screen point
function zoomSmooth(f,sx,sy){const nz=Math.max(1,Math.min(14,view.z*f)),wx=(sx-view.ox)/view.z,wy=(sy-view.oy)/view.z,cx=(450-view.ox)/view.z,cy=(450-view.oy)/view.z;
  // keep the tapped point under the finger: solve for the new view centre
  const gx=wx-(wx-cx)*view.z/nz,gy=wy-(wy-cy)*view.z/nz;if(nz===1)goTo(450,450,1);else goTo(gx,gy,nz);}
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.metaKey||e.ctrlKey)return;
  if(e.key==='+'||e.key==='=')zoomSmooth(1.5,450,450);else if(e.key==='-'||e.key==='_')zoomSmooth(1/1.5,450,450);else if(e.key==='0'){stopTrack();goTo(450,450,1);}});
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
function drawSpecimen(){const el=$('specimen');brain.style.display=sel&&W.c.includes(sel)?'block':'none';if(!sel||!W.c.includes(sel)){if(sel){el.className='specimen empty';el.textContent='The selected organism has died.';sel=null;$('cardrow').hidden=true;}return;}
  const s=W.species[sel.sp],root=W.species[s.root];el.className='specimen';$('cardrow').hidden=false;
  el.innerHTML=`<div class="name"></div><div class="meta"><span>No. ${sel.id}</span><span>Generation ${sel.gen}</span><span>Age ${sel.age}</span><span>Energy ${sel.e.toFixed(2)} <span class="ebar"></span></span><span>Lineage ${root.released?'released by '+short(root.owner):'wild'}</span><span>Kin alive ${s.count}</span></div>`;
  el.querySelector('.name').textContent=spName(s);
  const sb=$('starsp');if(sb)sb.firstChild.textContent=follows.has(lineOf(s.id))?'Following':'Follow lineage';
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
  const st=$('standing');st.innerHTML='';(ledger.scores||[]).slice(0,5).forEach((w,i)=>{const li=document.createElement('li');li.innerHTML=`<span class="pl">${i+1}</span><span class="nm"></span><span class="sc">${w.score}</span><span class="sub">${w.alive} alive, ${w.zones||0} zone${w.zones===1?'':'s'}, ${w.kills||0} hunted, ${short(w.owner)}</span>`;li.querySelector('.nm').textContent=w.name;st.append(li);});
  if(!st.children.length)st.innerHTML='<li><span></span><span class="muted">No released lineage alive.</span></li>';
  const se=$('seasons');se.innerHTML='';ledger.payouts.slice().reverse().slice(0,4).forEach(p=>{for(const t of (p.txs.length?p.txs:p.winners.map(w=>({place:w.place,name:w.name,owner:w.owner})))){const li=document.createElement('li');
    li.innerHTML=`<span class="pl">${t.place}</span><span class="nm"></span><span class="sc">${t.lamports?(t.lamports/1e9).toFixed(4)+' SOL':''}</span><span class="sub">Season ${p.epoch}, ${short(t.owner)} ${t.sig?`<a href="${explorer(t.sig)}" target="_blank">payout tx</a>`:''} <a href="${share('Hall of Survivors, season '+p.epoch+'. '+t.name+' placed '+t.place+'.', '/h/'+p.epoch)}" target="_blank">Share on X</a></span>`;li.querySelector('.nm').textContent=t.name;se.append(li);}});
  if(!se.children.length)se.innerHTML='<li><span></span><span class="muted">The first season has not closed.</span></li>';
  const cl=$('chainlog');cl.innerHTML='';
  const rows=[].concat(ledger.burns.map(b=>({t:b.at,txt:`Burned ${Math.round(b.tokens).toLocaleString('en-US')} ${tk()} for ${b.solIn.toFixed(3)} SOL, dry run`,sig:b.sig})),ledger.commits.slice(-6).map(c=>({t:c.t,txt:`Committed hash ${c.h} at epoch ${c.t}`,sig:c.sig})));
  for(const r of rows.slice(-10).reverse()){const li=document.createElement('li');li.innerHTML=`<span></span><a target="_blank"></a>`;li.firstChild.textContent=r.txt;li.lastChild.href=explorer(r.sig);li.lastChild.textContent='tx';cl.append(li);}
  if(!rows.length)cl.innerHTML='<li><span class="muted">No burns or commits yet.</span></li>';
  drawEco();drawLog();}
function drawEco(){const E=ledger&&ledger.eco;if(!E)return;$('relprice').textContent='$'+E.price.toFixed(2);
  $('priceline').textContent=`Today's release price $${E.price.toFixed(2)} (${(E.priceLamports/1e9).toFixed(4)} SOL), yesterday avg return ${E.yAvg==null?'not measured yet':E.yAvg.toFixed(2)+'x'}. New releases are protected from disasters for ${Math.round(E.rules.shieldS/60)} minutes.`;}
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
async function connectWallet(){const pv=provider();if(!pv){toast('No Solana wallet found. Install Phantom or Solflare and switch it to devnet.');return false;}
  const r=await pv.connect();setTimeout(drawLines,50);wallet=(r&&r.publicKey||pv.publicKey).toString();$('who').textContent=short(wallet);$('connect').firstChild.textContent='Connected';drawSkill();return true;}
$('connect').onclick=connectWallet;
window.__prim={wallet:()=>wallet,connect:connectWallet,releaseFree:n=>{const m=mark||bestVent();return buy(Object.assign({t:'release',name:n,free:1},m?{x:m[0],y:m[1]}:{}),0,0);},locate:id=>locate(id)};
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
$('release').addEventListener('submit',e=>{e.preventDefault();const n=$('spname').value.trim().replace(/[^\w .'-]/g,'').slice(0,24);if(!n)return;const L=ledger&&ledger.eco?ledger.eco.priceLamports:CFG.eco.priceLamports;buy(Object.assign({t:'release',name:n},mark?{x:mark[0],y:mark[1]}:{}),L,0);});
// Recommended start: mark the warm vent with the most algae nearby and suggest the first trait.
function bestVent(){let best=null,bv=-1;for(const v of W.vents){let n=0;for(const f of W.food){const dx=f.x-v[0],dy=f.y-v[1];if(dx*dx+dy*dy<3600)n++;}if(n>bv){bv=n;best=v;}}return best;}
$('recstart').onclick=()=>{const v=bestVent();if(!v)return;mark=[Math.round(v[0]),Math.round(v[1])];const r=$('recnote');r.hidden=false;
  r.textContent='Mark set on the warm vent with the most food. Release there, then burn for Efficient digestion as soon as your lineage reaches generation 3. That is what the best players do first.';
  view.ox=450-v[0]*view.z;view.oy=450-v[1]*view.z;};
window.__prim.bestVent=()=>bestVent();
// ---------- loop
let frame=0;
function catchUp(){target=predicted();const t0=performance.now();while(W.tick<target&&performance.now()-t0<14)stepOne();}
setInterval(()=>{if(W)catchUp();},33);
// Running fast: more than 45 ticks per real second for over 2 s, or far behind the server. Hide again once normal for 2 s.
setInterval(()=>{if(!W||document.hidden)return;const now=performance.now(),tps=speed.n*1000/(now-speed.at);speed.n=0;speed.at=now;const gap=srvTick-W.tick;
  if(tps>45||gap>150){speed.hi++;speed.ok=0;}else{speed.ok++;speed.hi=0;}const el=$('fastnote');if(speed.hi>=2)el.hidden=false;else if(speed.ok>=2)el.hidden=true;},1000);
$('fastgo').onclick=()=>location.reload();
// Returning to a hidden tab: jump to the latest checkpoint instead of fast-forwarding through the backlog.
document.addEventListener('visibilitychange',()=>{if(document.hidden||!W)return;speed.n=0;speed.at=performance.now();if(predicted()-W.tick>300){setSync('Catching up with the live tank.',true);resync().then(()=>{speed.n=0;speed.at=performance.now();});}});
let lastDraw=0,lastTickDrawn=-1,viewKey='',lastDom=0,lastBrain=0,lastSlow=0;
function loop(now){catchUp();requestAnimationFrame(loop);
  if(qs.get('sp')&&!sel){const id=+qs.get('sp');sel=W.c.find(k=>k.sp===id||W.species[k.sp].root===id)||null;if(sel){drawSpecimen();drawSkill();}}
  if(qs.get('pick')==='released'&&!sel){sel=W.c.find(k=>W.species[W.species[k.sp].root].released)||null;if(sel){drawSpecimen();drawSkill();}}
  if(qs.get('zoom')&&!loop.z&&sel){loop.z=1;view.z=+qs.get('zoom');view.ox=450-sel.x*view.z;view.oy=450-sel.y*view.z;}
  camStep();
  const vk=view.z+','+view.ox+','+view.oy+','+(sel?sel.id:0)+','+(selLine==null?'':selLine)+','+follows.size+','+(mark?mark.join():'');
  if(now-lastDraw<31||(W.tick===lastTickDrawn&&vk===viewKey))return;
  lastDraw=now;lastTickDrawn=W.tick;viewKey=vk;frame++;
  if(frame===1)document.body.classList.remove('booting');
  {const t=performance.now();drawTank();perf.draw+=performance.now()-t;perf.draws++;perf.frames++;}
  if(now-lastBrain>250){lastBrain=now;drawBrain();}
  if(now-lastDom>500){lastDom=now;drawFeed();drawSpecimen();$('tick').textContent=W.tick;$('tick2').textContent=W.tick;$('pop').textContent=W.c.length;let n=0;for(const s of W.species)if(s.count)n++;$('nsp').textContent=n;}
  if(now-lastSlow>1500){lastSlow=now;drawTree();drawSkill();drawLines();}
}
boot();
})();
