// First-visit guide, free first release dialog. UI only.
(function(){
'use strict';
const $=id=>document.getElementById(id),GK='primordial.guide';
const steps=[
 ['Pick a creature','Look at the dish. Every speck is a living creature with a small brain. Click one to see what it is thinking. When you are ready, choose a name for a creature of your own.'],
 ['Release it','Connect a Solana wallet so payouts can reach you, then release a creature. The first 500 wallets can reserve one free microbe by sharing our post on X; release opens the moment $SOUP launches.'],
 ['Watch it, get paid while it lives','Your creature eats, splits and evolves without you. Every hour the prize pool pays lineages that are still alive, in SOL. The longer they live, the more they earn. Many players lose money, a few win big.']];
let i=0;
function show(){$('gstep').textContent=`Step ${i+1} of 3`;$('gtitle').textContent=steps[i][0];$('gbody').textContent=steps[i][1];$('gnext').firstChild.textContent=i===2?'Start':'Next';}
function close(){$('guide').hidden=true;localStorage.setItem(GK,'done');}
$('gnext').onclick=()=>{if(i<2){i++;show();}else close();};$('gskip').onclick=close;
if(localStorage.getItem(GK)!=='done'&&!new URLSearchParams(location.search).get('noguide')){show();$('guide').hidden=false;}
// free microbe claim dialog (X share). While the claim is closed it only previews the steps.
const dlg=$('releaseDlg');let st=null;
const note=t=>{$('dlgNote').textContent=t||'';};
async function api(act){const w=window.__prim&&window.__prim.wallet();const r=await fetch('/api/claim?wallet='+encodeURIComponent(w||'')+(act?'&act='+act:''),{method:act?'POST':'GET'});st=await r.json();render();return st;}
const DK='primordial.claimsteps',done=()=>{try{return JSON.parse(localStorage.getItem(DK)||'{}');}catch(e){return {};}};
function mark(k){const d=done();d[k]=1;localStorage.setItem(DK,JSON.stringify(d));paint();}
function paint(){const d=done();for(let k=1;k<=5;k++)$('cs'+k).classList.toggle('done',!!(k===1?st&&st.code:k===5?st&&st.granted:d[k]));}
const fill=(t,c)=>String(t||'').replace('{code}',c||'');
function render(){if(!st)return;$('clAge').textContent=st.minAgeDays;$('clFol').textContent=st.minFollowers;const h=st.handle||'primordialfun';$('clHandle').textContent='@'+h;
  const open=st.open&&!(st.soldOut&&!st.granted),pre=!!st.codesOpen&&!(st.soldOut&&!st.granted),has=!!st.code,tw=st.tweet;
  $('clClosed').hidden=st.open||pre;$('clKicker').textContent=st.open?`${st.remaining} of ${st.max} free microbes left`:'Free microbe, opens at launch';
  if(st.soldOut&&!st.granted)$('clKicker').textContent='All free microbes claimed';
  $('clFollow').href='https://x.com/intent/follow?screen_name='+encodeURIComponent(h);
  if(tw){$('clLike').href='https://x.com/intent/like?tweet_id='+tw;
    $('clPost').href='https://x.com/intent/post?text='+encodeURIComponent(fill(st.copy,st.code))+'&url='+encodeURIComponent('https://x.com/'+h+'/status/'+tw);
    $('clReply').href='https://x.com/intent/post?in_reply_to='+tw+'&text='+encodeURIComponent(fill(st.replyCopy,st.code));}
  const en=(id,on)=>{const e=$(id);if(e.tagName==='BUTTON')e.disabled=!on;else e.classList.toggle('dis',!on);};
  en('clCode',pre&&!has);en('clPost',open&&has);en('clFollow',pre||open);en('clLike',open&&!!tw);en('clReply',open&&has);en('clCheck',open&&has&&!st.granted);
  $('clCodeOut').textContent=st.code||'';{const w=window.__prim&&window.__prim.wallet();$('clDisc').hidden=!w;$('clWho').textContent=w?'Connected '+w.slice(0,4)+'...'+w.slice(-4):'';}document.querySelectorAll('.cs5 .wait').forEach(e=>e.hidden=!(pre&&!tw));$('clCode').hidden=has;if(pre&&!st.open)$('clKicker').textContent=has?'Your code is ready':'Free microbe, sign up now';paint();
  if(!st.open){$('dlgGo').hidden=true;$('clNameRow').hidden=true;note(pre?(has?'Your code is saved to your wallet. Post on X, Like, Reply and Check open when the launch post is live.':'Connect and sign now to get your code. Post on X, Like, Reply and Check open when the launch post is live.'):'Opens at launch. Buttons switch on when the claim opens.');return;}
  if(st.soldOut&&!st.granted){$('clNameRow').hidden=true;$('dlgGo').hidden=true;note(`All ${st.max} free microbes have been claimed. You can still release one at today's price from the Intervene panel.`);return;}
  const ready=st.granted&&!st.used;$('clNameRow').hidden=!ready;$('dlgGo').hidden=!ready;
  if(ready&&!st.releaseOpen){$('clKicker').textContent='Reserved. Release opens when $SOUP launches.';$('dlgGo').firstChild.textContent=st.reservedName?'Update name':'Save name';if(st.reservedName&&!$('freeName').value)$('freeName').value=st.reservedName;
    note(`${st.reservedName?st.reservedName+' is saved. ':''}Name your microbe now. The moment the $SOUP token goes live, every reserved microbe can be released into the Soup at the same time. Turn on notifications from @${h} so you don't miss it.`);return;}
  if(ready)$('dlgGo').firstChild.textContent='Release my microbe';
  note(st.error||st.reason||(st.used?'Your free microbe is already in the dish.':ready?'Confirmed. Name your microbe and release it.':st.pending?'Looking for your post. This can take a few minutes. You can close this window and come back.':''));}
['clPost','clFollow','clLike','clReply'].forEach((id,i)=>$(id).addEventListener('click',()=>{if(id==='clLike'||id==='clReply')mark(4);else mark(i===0?2:3);}));
$('ctaRelease').onclick=async()=>{dlg.hidden=false;await api('');};
if(location.pathname==='/claim'){$('dlgCancel').textContent='See the live dish';const h=document.querySelector('#releaseDlg h2');h.innerHTML='<span style="display:block;font-size:.62em;font-style:normal;letter-spacing:.02em;color:#a4472b">First 500 Solana wallets</span>The first shared petri dish. Claim a free microbe.';h.insertAdjacentHTML('afterend','<p class="muted small">Still testing the best survival model. Claim and name your microbe now. Release opens the moment $SOUP launches.</p>');}
if(new URLSearchParams(location.search).get('claim')||location.pathname==='/claim')setTimeout(()=>$('ctaRelease').click(),800);
$('clWhat').onclick=()=>{const p=$('clWhatP'),on=p.hidden;p.hidden=!on;$('clWhat').setAttribute('aria-expanded',String(on));};
$('dlgCancel').onclick=()=>{dlg.hidden=true;};
async function needWallet(){const p=window.__prim;if(!p)return false;if(p.wallet())return true;const ok=await p.connect();if(!ok)note('Choose a Solana wallet to continue.');return !!ok;}
$('clCode').onclick=async()=>{if(!(await needWallet()))return;const w=window.__prim.wallet();const g=await (await fetch('/api/claim?wallet='+encodeURIComponent(w))).json();
  const pv=window.__wallets.current();if(!pv||!pv.signMessage){note('Your wallet cannot sign messages. Try Phantom or Solflare.');return;}
  try{const r=await pv.signMessage(new TextEncoder().encode(g.bindMsg),'utf8');const sg=r.signature||r;let b='';for(const x of sg)b+=String.fromCharCode(x);
    await api('code&sig='+encodeURIComponent(btoa(b)));}catch(e){note('Signature cancelled. Nothing was sent.');}};
async function resetClaim(){
  for(const S of [localStorage,sessionStorage])for(const k of Object.keys(S))if(/^primordial\.(claim|wallet|sig|session|code)/.test(k))S.removeItem(k);
  st=null;$('clCodeOut').textContent='';$('freeName').value='';}
window.addEventListener('prim-wallet-reset',()=>{window.__prim&&window.__prim.clear&&window.__prim.clear();resetClaim();});
window.addEventListener('prim-wallet-change',()=>{if(!dlg.hidden)api('');});
$('clDisc').onclick=async()=>{try{await window.__prim.disconnect();}catch(e){console.error(e);}
  for(const S of [localStorage,sessionStorage])for(const k of Object.keys(S))if(/^primordial\.(claim|wallet|sig|session|code)/.test(k))S.removeItem(k);
  st=null;$('clCodeOut').textContent='';$('freeName').value='';await api('');note('Disconnected. Pick any wallet to start again.');};
$('clCheck').onclick=async()=>{if(await needWallet())await api('check');setTimeout(()=>{if(!dlg.hidden&&st&&st.pending)api('');},65000);};
$('dlgGo').onclick=async()=>{const n=$('freeName').value.trim().replace(/[^\w .'-]/g,'').slice(0,24);if(!n){note('Give your microbe a name first.');return;}
  if(!(await needWallet()))return;if(st&&!st.releaseOpen){await window.__prim.releaseFree(n);return;}dlg.hidden=true;window.__prim.releaseFree(n);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dlg.hidden=true;}});
})();

if(localStorage.getItem('primordial.zoomhint')){const h=document.getElementById('zhint');if(h)h.classList.add('gone');}else setTimeout(()=>{const h=document.getElementById('zhint');if(h){h.classList.add('gone');localStorage.setItem('primordial.zoomhint','1');}},9000);
