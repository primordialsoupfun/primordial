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
if(localStorage.getItem(GK)!=='done'&&location.pathname!=='/claim'&&!new URLSearchParams(location.search).get('noguide')){show();$('guide').hidden=false;}
// free microbe claim dialog. Steps: sign for code, follow, name, share card on X, automatic check by the server.
const dlg=$('releaseDlg');let st=null,editing=false,pollT=null;const signedNow=new Set();
const note=t=>{$('dlgNote').textContent=t||'';};
const me=()=>window.__prim&&window.__prim.wallet();
async function api(act){const w=me();try{const r=await fetch('/api/claim?wallet='+encodeURIComponent(w||'')+(act?'&act='+act:''),{method:act?'POST':'GET'});st=await r.json();const CK='primordial.code.'+w;if(st&&w&&st.wallet===w){if(st.code)localStorage.setItem(CK,st.code);else if(localStorage.getItem(CK)){st.code=localStorage.getItem(CK);st.cardUrl='/c/'+st.code;}}}catch(e){note('Network error. Try again.');return st;}render();return st;}
const SK=c=>'primordial.claimshared.'+c,shared=()=>!!(st&&st.code&&localStorage.getItem(SK(st.code)));
const hm=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
function schedulePoll(on){clearTimeout(pollT);if(on)pollT=setTimeout(()=>{if(!dlg.hidden)api('');else schedulePoll(true);},15000);}
function render(){if(!st)return;const h=st.handle||'primordialfun';$('clAge').textContent=st.minAgeDays;$('clFol').textContent=st.minFollowers;$('clHandle').textContent='@'+h;
  const w=me(),mine=!!w&&st.wallet===w,has=mine&&!!st.code,pre=!!st.codesOpen&&!(st.soldOut&&!st.granted),open=st.open&&!(st.soldOut&&!st.granted),tw=st.tweet,named=has&&!!st.reservedName;
  $('clClosed').hidden=st.open||pre;$('clKicker').textContent=st.soldOut&&!st.granted?'All free microbes claimed':st.open?`${st.remaining} of ${st.max} free microbes left`:pre?'Free microbe, sign up now':'Free microbe, opens at launch';
  $('clFollow').href='https://x.com/intent/follow?screen_name='+encodeURIComponent(h);
  const card=has?location.origin+'/c/'+st.code:'';const txt=has?`My free microbe ${st.reservedName||''} is waiting in the Soup, the first shared petri dish on Solana. First 500 wallets. Code ${st.code} ${card}`.replace('  ',' '):'';
  if(tw&&has){$('clReply').href='https://x.com/intent/post?in_reply_to='+tw+'&text='+encodeURIComponent(txt);$('clPost').href='https://x.com/intent/post?text='+encodeURIComponent(txt)+'&url='+encodeURIComponent('https://x.com/'+h+'/status/'+tw);}
  const en=(id,on)=>{const e=$(id);if(e.tagName==='BUTTON'||e.tagName==='INPUT')e.disabled=!on;else e.classList.toggle('dis',!on);};
  en('clCode',pre&&!has);en('clFollow',pre||open);en('freeName',has&&!st.used);en('clSave',has&&!st.used);en('clReply',open&&named&&!!tw);en('clPost',open&&named&&!!tw);en('clCheck',open&&named&&!st.granted&&!st.pending);
  $('clCode').hidden=has;$('clCodeOut').textContent=has?st.code:'';$('clDisc').hidden=!w;const sw=w?w.slice(0,4)+'...'+w.slice(-4):'';
  $('clWho').textContent=!w?'':!has?`Connected ${sw}, sign to continue`:signedNow.has(w)?`Signed by ${sw}`:`Signed earlier by ${sw}`;
  if(named&&document.activeElement!==$('freeName')&&!$('freeName').value)$('freeName').value=st.reservedName;$('clSave').firstChild.textContent=named?'Update name':'Save name';
  const img=$('clCardImg');if(named){const src='/og/c/'+st.code+'.png?n='+encodeURIComponent(st.reservedName)+(st.granted?'&r=1':'');if(img.getAttribute('src')!==src)img.src=src;img.hidden=false;}else img.hidden=true;
  const d={1:has,2:has&&!!localStorage.getItem('primordial.followed'),3:named,4:has&&(shared()||st.pending||st.granted),5:mine&&st.granted};for(let k=1;k<=5;k++)$('cs'+k).classList.toggle('done',!!d[k]);
  // waiting state
  const wt=$('clWait');const rej=mine&&!st.granted&&!st.pending&&st.reason;wt.hidden=!(mine&&!st.granted&&(st.pending||rej));wt.classList.toggle('err',!!rej);
  if(rej){$('cwHead').textContent='We could not reserve your microbe';$('cwText').textContent=st.reason+' Fix it, post again if needed, then press Check now.';$('cwLast').textContent='';}
  else if(st.pending){$('cwHead').textContent='Waiting for your post';$('cwText').textContent='We check X automatically every minute. New posts can take a few minutes to appear. Keep this page open or come back later; your spot is held for 24 hours.';
    $('cwLast').textContent=(st.lastPoll&&st.lastPoll>=st.pendingSince?'Last checked '+hm(st.lastPoll)+'. ':'First check within a minute. ')+'Waiting since '+hm(st.pendingSince)+'.';}
  schedulePoll(mine&&!!st.pending);
  if(!st.open){$('dlgGo').hidden=true;note(pre?(has?'Your code is ready. Sharing opens when the launch post is live.':'Connect and sign to get your code.'):'Opens at launch.');finish(false);return;}
  // completion
  const fin=mine&&st.granted&&!st.used&&!editing;finish(fin);
  if(fin){$('cdNo').textContent=`Claim #${st.claimNo||'-'} of ${st.max}`;$('cdName').textContent=st.reservedName||'Unnamed microbe';$('cdWallet').textContent=sw;
    $('cdStatus').textContent=st.releaseOpen?'Ready to release':'Reserved, releases when $SOUP launches';
    $('cdShare').href='https://x.com/intent/post?text='+encodeURIComponent(`I reserved ${st.reservedName||'a free microbe'} in the Soup, the first shared petri dish on Solana. First 500 wallets.`)+'&url='+encodeURIComponent(location.origin+'/c/'+st.code);
    $('cdNotify').href='https://x.com/'+h;$('dlgGo').hidden=!st.releaseOpen;$('dlgGo').firstChild.textContent='Release my microbe';return;}
  $('dlgGo').hidden=true;
  note(st.error||(st.soldOut&&!st.granted?`All ${st.max} free microbes have been claimed.`:st.used?'Your free microbe is already in the dish.':''));}
function finish(on){const c=document.querySelector('#releaseDlg .card');c.classList.toggle('isdone',on);$('clDone').hidden=!on;}
$('clFollow').addEventListener('click',()=>{localStorage.setItem('primordial.followed','1');setTimeout(render,300);});
const onShare=()=>{if(!st||!st.code)return;localStorage.setItem(SK(st.code),'1');setTimeout(()=>api('check'),1500);};
$('clReply').addEventListener('click',onShare);$('clPost').addEventListener('click',onShare);
$('ctaRelease').onclick=async()=>{dlg.hidden=false;await api('');};
if(location.pathname==='/claim'){$('dlgCancel').textContent='See the live dish';const hh=document.querySelector('#releaseDlg .card > h2');hh.innerHTML='<span style="display:block;font-size:.62em;font-style:normal;letter-spacing:.02em;color:#a4472b">First 500 Solana wallets</span>The first shared petri dish. Claim a free microbe.';hh.insertAdjacentHTML('afterend','<p class="muted small">Still testing the best survival model. Sign, name your microbe and share your card on X. We check X automatically and reserve your microbe. Release opens the moment $SOUP launches.</p>');}
if(new URLSearchParams(location.search).get('claim')||location.pathname==='/claim')setTimeout(()=>$('ctaRelease').click(),800);
$('cdEdit').onclick=()=>{editing=true;render();$('freeName').focus();};
$('cdDisc').onclick=()=>$('clDisc').click();
$('clWhat').onclick=()=>{const p=$('clWhatP'),on=p.hidden;p.hidden=!on;$('clWhat').setAttribute('aria-expanded',String(on));};
$('dlgCancel').onclick=()=>{dlg.hidden=true;};
async function needWallet(){const p=window.__prim;if(!p)return false;if(p.wallet())return true;const ok=await p.connect();if(!ok)note('Choose a Solana wallet to continue.');return !!ok;}
$('clCode').onclick=async()=>{if(!(await needWallet()))return;const w=me();let g;try{g=await (await fetch('/api/claim?wallet='+encodeURIComponent(w))).json();}catch(e){note('Network error. Try again.');return;}
  if(!g.code&&localStorage.getItem('primordial.code.'+w)){g.code=localStorage.getItem('primordial.code.'+w);g.cardUrl='/c/'+g.code;}if(g.code){st=g;render();return;}
  const pv=window.__wallets.current();if(!pv||!pv.signMessage){note('Your wallet cannot sign messages. Try Phantom or Solflare.');return;}
  try{const r=await pv.signMessage(new TextEncoder().encode(g.bindMsg),'utf8');const sg=r.signature||r;let b='';for(const x of sg)b+=String.fromCharCode(x);
    await api('code&sig='+encodeURIComponent(btoa(b)));if(st&&st.code&&st.wallet===w){signedNow.add(w);render();}}catch(e){console.error('[claim] sign failed',e);note('Signature cancelled. Nothing was sent.');}};
function clearLocal(){for(const S of [localStorage,sessionStorage])for(const k of Object.keys(S))if(/^primordial\.(claim|wallet|sig|session|code)/.test(k)&&!/^primordial\.claimshared\./.test(k))S.removeItem(k);}
function resetClaim(){editing=false;clearLocal();st=null;$('clCodeOut').textContent='';$('freeName').value='';$('clSaved').hidden=true;schedulePoll(false);}
window.addEventListener('prim-wallet-reset',()=>{window.__prim&&window.__prim.clear&&window.__prim.clear();resetClaim();});
window.addEventListener('prim-wallet-change',()=>{if(!dlg.hidden)api('');});
$('clDisc').onclick=async()=>{try{await window.__prim.disconnect();}catch(e){console.error(e);}resetClaim();await api('');note('Disconnected. Pick any wallet to start again.');};
$('clCheck').onclick=async()=>{if(await needWallet())await api('check');};
const saveName=async()=>{const n=$('freeName').value.trim().replace(/[^\w .'-]/g,'').slice(0,24);const sv=$('clSaved');if(!n){sv.textContent='Give your microbe a name first.';sv.className='small saved err';sv.hidden=false;return;}
  if(!(await needWallet()))return;const bt=$('clSave'),lab=bt.firstChild.textContent;bt.disabled=true;bt.firstChild.textContent='Saving...';let r;
  try{r=await window.__prim.releaseFree(n,true);}catch(e){r={ok:false,error:e.message};}bt.disabled=false;bt.firstChild.textContent=lab;
  if(r&&r.ok&&r.reserved){editing=false;$('freeName').value=r.name;await api('');const w=me()||'';sv.textContent=`Name saved at ${hm(Date.now())}: ${r.name}, wallet ${w.slice(0,4)}...${w.slice(-4)}`;sv.className='small saved ok';}
  else{sv.textContent='Name not saved. '+((r&&r.error)||'Try again.');sv.className='small saved err';}
  sv.hidden=false;clearTimeout(window.__svT);window.__svT=setTimeout(()=>{sv.hidden=true;},12000);};
$('clSave').onclick=saveName;$('freeName').addEventListener('keydown',e=>{if(e.key==='Enter')saveName();});
$('dlgGo').onclick=async()=>{if(!st||!st.releaseOpen)return;const n=st.reservedName||$('freeName').value.trim();if(!n){note('Give your microbe a name first.');return;}if(!(await needWallet()))return;dlg.hidden=true;window.__prim.releaseFree(n);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dlg.hidden=true;}});
})();

if(localStorage.getItem('primordial.zoomhint')){const h=document.getElementById('zhint');if(h)h.classList.add('gone');}else setTimeout(()=>{const h=document.getElementById('zhint');if(h){h.classList.add('gone');localStorage.setItem('primordial.zoomhint','1');}},9000);
