// Solana wallet picker. Wallet Standard discovery plus legacy injected providers. Solana only.
(function(){'use strict';
let current=null,resolver=null,render=null;
const found=new Map(); // name -> {name,icon,std?,legacy?}
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(u8){const d=[];for(const x of u8){let c=x;for(let j=0;j<d.length;j++){c+=d[j]*256;d[j]=c%58;c=(c/58)|0;}while(c){d.push(c%58);c=(c/58)|0;}}let s='';for(const x of u8){if(x)break;s+='1';}for(let i=d.length-1;i>=0;i--)s+=B58[d[i]];return s;}
function addStd(w){if(!w||!w.name)return;const f=w.features||{};
  const sol=(w.chains||[]).some(c=>String(c).startsWith('solana:'))||Object.keys(f).some(k=>k.startsWith('solana:'));
  let key=w.name;if(/metamask/i.test(w.name)){for(const k of [...found.keys()])if(/metamask/i.test(k)&&!found.get(k).std)found.delete(k);key='MetaMask';}
  const prev=found.get(key);if(prev&&prev.std&&prev.solana&&!sol)return;
  const cur=prev||{name:key};cur.std=w;cur.icon=w.icon||cur.icon;delete cur.legacy;
  cur.solana=sol&&!!f['standard:connect']&&!!f['solana:signMessage'];cur.canSign=!!f['solana:signMessage'];cur.evmOnly=false;found.set(key,cur);render&&render();}
const api={register:(...ws)=>{ws.forEach(addStd);return ()=>{};}};
window.addEventListener('wallet-standard:register-wallet',e=>{try{e.detail(api);}catch(x){}});
try{window.dispatchEvent(new CustomEvent('wallet-standard:app-ready',{detail:api}));}catch(x){}
function legacy(){const L=[['Phantom',window.phantom&&window.phantom.solana],['Solflare',window.solflare],['Backpack',window.backpack&&window.backpack.solana||window.backpack],
  ['OKX Wallet',window.okxwallet&&window.okxwallet.solana],['Coinbase Wallet',window.coinbaseSolana],['Trust Wallet',window.trustwallet&&window.trustwallet.solana]];
  const has=n=>[...found.keys()].some(k=>k.toLowerCase().split(' ')[0]===n.toLowerCase().split(' ')[0]);
  for(const [n,p] of L)if(p&&p.connect&&!has(n)&&![...found.values()].some(v=>v.legacy===p))found.set(n,{name:n,legacy:p,solana:true,canSign:!!p.signMessage});
  // Generic window.solana: only when it is not one of the named wallets already listed.
  const g=window.solana;if(g&&g.connect){const flag=g.isPhantom?'Phantom':g.isSolflare?'Solflare':g.isBackpack?'Backpack':g.isOkxWallet?'OKX Wallet':g.isCoinbaseWallet?'Coinbase Wallet':g.isTrust?'Trust Wallet':g.isMetaMask?'MetaMask':null;
    const dup=[...found.values()].some(v=>v.legacy===g)||(flag&&has(flag))||(found.size>0&&!flag);
    if(!dup)found.set(flag||'Solana wallet',{name:flag||'Solana wallet',legacy:g,solana:true,canSign:!!g.signMessage});}
  if(window.ethereum&&window.ethereum.isMetaMask&&!has('MetaMask'))found.set('MetaMask',{name:'MetaMask',icon:'/wallets/metamask.png',solana:false,evmOnly:true});}
const CHAIN=()=>'solana:'+((window.__primCluster==='mainnet'||window.__primCluster==='mainnet-beta')?'mainnet':'devnet');
function adapter(e){if(e.legacy)return e.legacy;const w=e.std,f=w.features;let acct=null;
  const a={name:e.name,publicKey:null,
    async connect(){const r=await f['standard:connect'].connect();acct=(r.accounts||w.accounts||[]).find(x=>(x.chains||[]).some(c=>String(c).startsWith('solana:')))||(r.accounts||w.accounts)[0];
      if(!acct)throw new Error('No Solana account in this wallet.');a.publicKey={toString:()=>acct.address};return {publicKey:a.publicKey};},
    async signMessage(msg){if(!f['solana:signMessage'])throw new Error('This wallet cannot sign messages.');const [o]=await f['solana:signMessage'].signMessage({account:acct,message:msg});return {signature:o.signature};},
    async signAndSendTransaction(tx){const ft=f['solana:signAndSendTransaction'];if(!ft)throw new Error('This wallet cannot send Solana transactions.');
      const bytes=tx.serialize({requireAllSignatures:false,verifySignatures:false});const [o]=await ft.signAndSendTransaction({account:acct,transaction:bytes,chain:CHAIN()});return {signature:b58(o.signature)};}};
  a.disconnect=async()=>{const d=f['standard:disconnect'];if(d)await d.disconnect();acct=null;a.publicKey=null;};
  return a;}
// install or open links. Deep links only where the wallet documents one.
const here=()=>location.origin+'/claim',enc=encodeURIComponent;
const KNOWN=[
 {name:'Phantom',icon:'/wallets/phantom.svg',site:'https://phantom.app/download',deep:()=>'https://phantom.app/ul/browse/'+enc(here())+'?ref='+enc(location.origin)},
 {name:'Solflare',icon:'/wallets/solflare.svg',site:'https://solflare.com/download',deep:()=>'https://solflare.com/ul/v1/browse/'+enc(here())+'?ref='+enc(location.origin)},
 {name:'MetaMask',icon:'/wallets/metamask.png',site:'https://metamask.io/download',deep:()=>'https://metamask.app.link/dapp/'+here().replace(/^https?:\/\//,''),note:'Needs MetaMask with Solana accounts turned on.'},
 {name:'Backpack',icon:'/wallets/backpack.png',site:'https://backpack.app/downloads',deep:()=>'https://backpack.app/ul/v1/browse/'+enc(here())+'?ref='+enc(location.origin)},
 {name:'OKX Wallet',icon:'/wallets/okx.png',site:'https://www.okx.com/web3',deep:()=>'okx://wallet/dapp/url?dappUrl='+enc(here())},
 {name:'Coinbase Wallet',icon:'/wallets/coinbase.svg',site:'https://www.coinbase.com/wallet/downloads'},
 {name:'Trust Wallet',icon:'/wallets/trust.svg',site:'https://trustwallet.com/download'}];
const mobile=()=>/iPhone|iPad|Android/i.test(navigator.userAgent);
function el(h){const d=document.createElement('div');d.innerHTML=h;return d.firstElementChild;}
function open(){try{window.dispatchEvent(new CustomEvent('wallet-standard:app-ready',{detail:api}));}catch(x){}legacy();let dlg=document.getElementById('walletDlg');
  if(!dlg){dlg=el('<div id="walletDlg" class="guide" style="z-index:60"><div class="card wpick"><p class="gstep">Solana only</p><h2>Choose a wallet</h2><div id="wpList"></div><p class="muted small" id="wpNote">Signing in is a message signature. No transaction, no fee.</p><div class="gnav"><button id="wpCancel" class="link">Not now</button></div></div></div>');
    document.body.appendChild(dlg);dlg.querySelector('#wpCancel').onclick=()=>{dlg.hidden=true;resolver&&resolver(null);resolver=null;};}
  render=()=>{const list=dlg.querySelector('#wpList');list.innerHTML='';const inst=[...found.values()];
    const row=(name,icon,label,cls)=>{const r=el('<div class="wprow"><span class="wpn"></span><span class="wpact"></span></div>');const n=r.firstChild;if(icon){const im=document.createElement('img');im.src=icon;im.alt='';n.appendChild(im);}else n.appendChild(document.createElement('i'));n.appendChild(document.createTextNode(name));return r;};
    if(inst.length){list.appendChild(el('<p class="wph">Installed</p>'));for(const e of inst){const kn=KNOWN.find(k=>e.name.toLowerCase().startsWith(k.name.toLowerCase().split(' ')[0]));const r=row(e.name,e.icon||(kn&&kn.icon));const a=r.querySelector('.wpact');
      if(!e.solana){a.textContent=e.evmOnly?'Solana not enabled':'Needs Solana support';a.className='wpact muted small';if(e.evmOnly)r.appendChild(el('<p class="muted small wpnote">Turn on Solana in MetaMask (Add account, then Solana), then reload this page.</p>'));}
      else{const b=el('<button class="ghost"><span>Connect</span></button>');b.onclick=async()=>{dlg.querySelector('#wpNote').textContent='Connecting to '+e.name+'.';try{if(current){await disconnect();window.dispatchEvent(new Event('prim-wallet-reset'));}const ad=adapter(e);await ad.connect();current=ad;dlg.hidden=true;resolver&&resolver(ad);resolver=null;}catch(x){console.error('[wallet] connect failed',e.name,x);dlg.hidden=false;dlg.querySelector('#wpNote').textContent=(x&&x.message?x.message+' ':'')+'Could not connect. Try again or choose another wallet.';}};a.appendChild(b);}
      list.appendChild(r);}}
    const others=KNOWN.filter(k=>!inst.some(e=>e.name.toLowerCase().startsWith(k.name.toLowerCase().split(' ')[0])));
    if(others.length){list.appendChild(el(`<p class="wph">${mobile()?'Open in a wallet app':'Other wallets'}</p>`));for(const k of others){const r=row(k.name,k.icon);const a=r.querySelector('.wpact');
      const link=(href,t)=>{const l=el(`<a class="ghost btn" rel="noopener"></a>`);l.href=href;l.textContent=t;if(!href.startsWith('okx:'))l.target='_blank';a.appendChild(l);};
      if(mobile()&&k.deep)link(k.deep(),'Open');else link(k.site,'Install');if(k.note)r.appendChild(el(`<p class="muted small wpnote">${k.note}</p>`));list.appendChild(r);}}};
  render();dlg.hidden=false;return new Promise(r=>{resolver=r;});}
async function disconnect(){const c=current;current=null;if(c&&c.disconnect){try{await c.disconnect();}catch(x){console.error('[wallet] disconnect failed',x);}}}
window.__wallets={pick:open,disconnect,current:()=>current,list:()=>{legacy();return [...found.values()];},b58};
const css=document.createElement('style');css.textContent='.wpick{max-width:440px;max-height:92vh;overflow-y:auto}.wph{font-family:var(--mono,monospace);font-size:12px;letter-spacing:.1em;color:#a4472b;margin:14px 0 4px}.wprow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-top:1px solid rgba(17,19,20,.25)}.wpn{display:flex;align-items:center;gap:10px;font-size:16px}.wpn img,.wpn i{width:30px;height:30px;flex:0 0 30px;border-radius:8px;object-fit:contain;background:#fff}.wpn i{border:1px solid rgba(58,47,36,.3);background:none}.wpact .btn{text-decoration:none;color:inherit;display:inline-flex}.wpnote{flex-basis:100%;margin:0}#walletDlg[hidden]{display:none!important}.whatp{background:rgba(164,71,43,.06);border:1px solid rgba(58,47,36,.18);border-radius:10px;padding:8px 14px;margin:0 0 10px}.whatp ul{margin:6px 0;padding-left:18px;line-height:1.5}.whatp p{margin:4px 0}';document.head.appendChild(css);
})();
