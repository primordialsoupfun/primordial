// Solana wallet picker. Wallet Standard discovery plus legacy injected providers. Solana only.
(function(){'use strict';
let current=null,resolver=null,render=null;
const found=new Map(); // name -> {name,icon,std?,legacy?}
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(u8){const d=[];for(const x of u8){let c=x;for(let j=0;j<d.length;j++){c+=d[j]*256;d[j]=c%58;c=(c/58)|0;}while(c){d.push(c%58);c=(c/58)|0;}}let s='';for(const x of u8){if(x)break;s+='1';}for(let i=d.length-1;i>=0;i--)s+=B58[d[i]];return s;}
function addStd(w){if(!w||!w.name)return;const sol=(w.chains||[]).some(c=>String(c).startsWith('solana:'));
  const f=w.features||{};const cur=found.get(w.name)||{name:w.name,icon:w.icon};cur.std=w;cur.icon=w.icon||cur.icon;
  cur.solana=sol&&!!f['standard:connect'];cur.canSign=!!f['solana:signMessage'];found.set(w.name,cur);render&&render();}
const api={register:(...ws)=>{ws.forEach(addStd);return ()=>{};}};
window.addEventListener('wallet-standard:register-wallet',e=>{try{e.detail(api);}catch(x){}});
try{window.dispatchEvent(new CustomEvent('wallet-standard:app-ready',{detail:api}));}catch(x){}
function legacy(){const L=[['Phantom',window.phantom&&window.phantom.solana],['Solflare',window.solflare],['Backpack',window.backpack&&window.backpack.solana||window.backpack],
  ['OKX Wallet',window.okxwallet&&window.okxwallet.solana],['Coinbase Wallet',window.coinbaseSolana],['Trust Wallet',window.trustwallet&&window.trustwallet.solana],['Solana wallet',window.solana]];
  if(window.ethereum&&![...found.keys()].some(n=>/metamask/i.test(n))&&window.ethereum.isMetaMask)found.set('MetaMask',{name:'MetaMask',solana:false});
  for(const [n,p] of L)if(p&&p.connect&&!found.has(n)&&![...found.values()].some(v=>v.legacy===p))found.set(n,{name:n,legacy:p,solana:true,canSign:!!p.signMessage});}
const CHAIN=()=>'solana:'+((window.__primCluster==='mainnet'||window.__primCluster==='mainnet-beta')?'mainnet':'devnet');
function adapter(e){if(e.legacy)return e.legacy;const w=e.std,f=w.features;let acct=null;
  const a={name:e.name,publicKey:null,
    async connect(){const r=await f['standard:connect'].connect();acct=(r.accounts||w.accounts||[]).find(x=>(x.chains||[]).some(c=>String(c).startsWith('solana:')))||(r.accounts||w.accounts)[0];
      if(!acct)throw new Error('No Solana account in this wallet.');a.publicKey={toString:()=>acct.address};return {publicKey:a.publicKey};},
    async signMessage(msg){if(!f['solana:signMessage'])throw new Error('This wallet cannot sign messages.');const [o]=await f['solana:signMessage'].signMessage({account:acct,message:msg});return {signature:o.signature};},
    async signAndSendTransaction(tx){const ft=f['solana:signAndSendTransaction'];if(!ft)throw new Error('This wallet cannot send Solana transactions.');
      const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});const [o]=await ft.signAndSendTransaction({account:acct,transaction:bytes,chain:CHAIN()});return {signature:b58(o.signature)};}};
  return a;}
// install or open links. Deep links only where the wallet documents one.
const here=()=>location.origin+'/claim',enc=encodeURIComponent;
const KNOWN=[
 {name:'Phantom',site:'https://phantom.app/download',deep:()=>'https://phantom.app/ul/browse/'+enc(here())+'?ref='+enc(location.origin)},
 {name:'Solflare',site:'https://solflare.com/download',deep:()=>'https://solflare.com/ul/v1/browse/'+enc(here())+'?ref='+enc(location.origin)},
 {name:'MetaMask',site:'https://metamask.io/download',deep:()=>'https://metamask.app.link/dapp/'+here().replace(/^https?:\/\//,''),note:'Needs MetaMask with Solana accounts turned on.'},
 {name:'Backpack',site:'https://backpack.app/downloads',deep:()=>'https://backpack.app/ul/v1/browse/'+enc(here())+'?ref='+enc(location.origin)},
 {name:'OKX Wallet',site:'https://www.okx.com/web3',deep:()=>'okx://wallet/dapp/url?dappUrl='+enc(here())},
 {name:'Coinbase Wallet',site:'https://www.coinbase.com/wallet/downloads'},
 {name:'Trust Wallet',site:'https://trustwallet.com/download'}];
const mobile=()=>/iPhone|iPad|Android/i.test(navigator.userAgent);
function el(h){const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild;}
function open(){legacy();let dlg=document.getElementById('walletDlg');
  if(!dlg){dlg=el('<div id="walletDlg" class="guide" style="z-index:60"><div class="card wpick"><p class="gstep">Solana only</p><h2>Choose a wallet</h2><div id="wpList"></div><p class="muted small" id="wpNote">Signing in is a message signature. No transaction, no fee.</p><div class="gnav"><button id="wpCancel" class="link">Not now</button></div></div></div>');
    document.body.appendChild(dlg);dlg.querySelector('#wpCancel').onclick=()=>{dlg.hidden=true;resolver&&resolver(null);resolver=null;};}
  render=()=>{const list=dlg.querySelector('#wpList');list.innerHTML='';const inst=[...found.values()];
    const row=(name,icon,label,cls)=>{const r=el('<div class="wprow"><span class="wpn"></span><span class="wpact"></span></div>');const n=r.firstChild;if(icon){const im=document.createElement('img');im.src=icon;im.alt='';n.appendChild(im);}else n.appendChild(document.createElement('i'));n.appendChild(document.createTextNode(name));return r;};
    if(inst.length){list.appendChild(el('<p class="wph">Installed</p>'));for(const e of inst){const r=row(e.name,e.icon);const a=r.querySelector('.wpact');
      if(!e.solana){a.textContent='Needs Solana support';a.className='wpact muted small';}
      else{const b=el('<button class="ghost"><span>Connect</span></button>');b.onclick=async()=>{const ad=adapter(e);try{await ad.connect();current=ad;dlg.hidden=true;resolver&&resolver(ad);resolver=null;}catch(x){dlg.querySelector('#wpNote').textContent=x.message||'Connection cancelled.';}};a.appendChild(b);}
      list.appendChild(r);}}
    const others=KNOWN.filter(k=>!inst.some(e=>e.name.toLowerCase().startsWith(k.name.toLowerCase().split(' ')[0])));
    if(others.length){list.appendChild(el(`<p class="wph">${mobile()?'Open in a wallet app':'Other wallets'}</p>`));for(const k of others){const r=row(k.name);const a=r.querySelector('.wpact');
      const link=(href,t)=>{const l=el(`<a class="ghost btn" rel="noopener"></a>`);l.href=href;l.textContent=t;if(!href.startsWith('okx:'))l.target='_blank';a.appendChild(l);};
      if(mobile()&&k.deep)link(k.deep(),'Open');else link(k.site,'Install');if(k.note)r.appendChild(el(`<p class="muted small wpnote">${k.note}</p>`));list.appendChild(r);}}};
  render();dlg.hidden=false;return new Promise(r=>{resolver=r;});}
window.__wallets={pick:open,current:()=>current,list:()=>{legacy();return [...found.values()];},b58};
const css=document.createElement('style');css.textContent='.wpick{max-width:440px;max-height:92vh;overflow-y:auto}.wph{font-family:var(--mono,monospace);font-size:12px;letter-spacing:.1em;color:#a4472b;margin:14px 0 4px}.wprow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px solid rgba(17,19,20,.25)}.wpn{display:flex;align-items:center;gap:10px;font-size:16px}.wpn img,.wpn i{width:26px;height:26px;border:1px solid #6b5e4c;border-radius:4px}.wpact .btn{text-decoration:none;color:inherit;display:inline-flex}.wpnote{flex-basis:100%;margin:0}#walletDlg[hidden]{display:none!important}';document.head.appendChild(css);
})();
