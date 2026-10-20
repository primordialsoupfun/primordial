// First-visit guide, free first release dialog. UI only.
(function(){
'use strict';
const $=id=>document.getElementById(id),GK='primordial.guide';
const steps=[
 ['Pick a creature','Look at the dish. Every speck is a living creature with a small brain. Click one to see what it is thinking. When you are ready, choose a name for a creature of your own.'],
 ['Release it, free','Press Release a creature. Connect a Solana wallet so prizes can reach you. One release per day is free and earns a quarter of a paid one. It costs only a network fee of a fraction of a cent.'],
 ['Watch it, get paid while it lives','Your creature eats, splits and evolves without you. At the end of each season the species with the most living descendants share the prize pool, paid in SOL to their releasers.']];
let i=0;
function show(){$('gstep').textContent=`Step ${i+1} of 3`;$('gtitle').textContent=steps[i][0];$('gbody').textContent=steps[i][1];$('gnext').firstChild.textContent=i===2?'Start':'Next';}
function close(){$('guide').hidden=true;localStorage.setItem(GK,'done');}
$('gnext').onclick=()=>{if(i<2){i++;show();}else close();};$('gskip').onclick=close;
if(localStorage.getItem(GK)!=='done'&&!new URLSearchParams(location.search).get('noguide')){show();$('guide').hidden=false;}
// release dialog
const dlg=$('releaseDlg');
$('ctaRelease').onclick=()=>{dlg.hidden=false;$('freeName').focus();};
$('dlgCancel').onclick=()=>{dlg.hidden=true;};
$('dlgGo').onclick=async()=>{const n=$('freeName').value.trim().replace(/[^\w .'-]/g,'').slice(0,24);if(!n){$('dlgNote').textContent='Give your creature a name first.';return;}
  const api=window.__prim;if(!api)return;
  if(!api.wallet()){const ok=await api.connect();if(!ok){$('dlgNote').textContent='No Solana wallet found. Install Phantom or Solflare, then try again.';return;}}
  dlg.hidden=true;api.releaseFree(n);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){dlg.hidden=true;}});
})();

if(localStorage.getItem('primordial.zoomhint')){const h=document.getElementById('zhint');if(h)h.classList.add('gone');}else setTimeout(()=>{const h=document.getElementById('zhint');if(h){h.classList.add('gone');localStorage.setItem('primordial.zoomhint','1');}},9000);
