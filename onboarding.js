// First-visit guide, free first release dialog. UI only.
(function(){
'use strict';
const $=id=>document.getElementById(id),GK='primordial.guide';
const steps=[
 ['Pick a creature','Look at the dish. Every speck is a living creature with a small brain. Click one to see what it is thinking. When you are ready, choose a name for a creature of your own.'],
 ['Release it','Connect a Solana wallet so payouts can reach you, then release a creature. At launch the first 500 wallets can claim one free microbe by sharing our post on X.'],
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
function render(){if(!st)return;$('clAge').textContent=st.minAgeDays;$('clFol').textContent=st.minFollowers;
  $('clClosed').hidden=st.open;$('clLive').hidden=!st.open;$('clKicker').textContent=st.open?`${st.remaining} of ${st.max} free microbes left`:'Free microbe, opens at launch';
  if(!st.open){$('dlgGo').hidden=true;return;}
  $('clCodeOut').textContent=st.code||'';const has=!!st.code;$('clPost').hidden=!has;$('clCheck').hidden=!has||st.granted;
  if(has&&st.tweet){const text=`My microbe is joining the Primordial tank. ${st.code}`;$('clPost').href='https://x.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent('https://x.com/i/status/'+st.tweet);}
  const ready=st.granted&&!st.used;$('clNameRow').hidden=!ready;$('dlgGo').hidden=!ready;
  note(st.error||st.reason||(st.used?'Your free microbe is already in the dish.':ready?'Confirmed. Name your microbe and release it.':st.pending?'Looking for your post. This can take a few minutes. You can close this window and come back.':''));}
$('ctaRelease').onclick=async()=>{dlg.hidden=false;await api('');};
$('dlgCancel').onclick=()=>{dlg.hidden=true;};
async function needWallet(){const p=window.__prim;if(!p)return false;if(p.wallet())return true;const ok=await p.connect();if(!ok)note('No Solana wallet found. Install Phantom or Solflare, then try again.');return !!ok;}
$('clCode').onclick=async()=>{if(await needWallet())await api('code');};
$('clCheck').onclick=async()=>{if(await needWallet())await api('check');setTimeout(()=>{if(!dlg.hidden&&st&&st.pending)api('');},65000);};
$('dlgGo').onclick=async()=>{const n=$('freeName').value.trim().replace(/[^\w .'-]/g,'').slice(0,24);if(!n){note('Give your microbe a name first.');return;}
  if(!(await needWallet()))return;dlg.hidden=true;window.__prim.releaseFree(n);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dlg.hidden=true;}});
})();

if(localStorage.getItem('primordial.zoomhint')){const h=document.getElementById('zhint');if(h)h.classList.add('gone');}else setTimeout(()=>{const h=document.getElementById('zhint');if(h){h.classList.add('gone');localStorage.setItem('primordial.zoomhint','1');}},9000);
