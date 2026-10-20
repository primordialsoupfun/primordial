// End-to-end player test on the configured cluster (local validator by default). Never prints keys.
const C=require('./chain.js');const {web3,spl,conn}=C;
const BASE=process.env.BASE||'http://localhost:8765';
// Free microbe claim (X share). Run the server with CLAIM_OPEN=1 CAMPAIGN_TWEET_ID=<id> X_MOCK_FILE=<path> CLAIM_POLL_S=2 CLAIM_MAX=1
// and pass the same X_MOCK_FILE here; the test writes the mock X search result itself, so no X API call is made.
async function claimFlow(A,pay,log){const fs=require('fs'),MOCK=process.env.X_MOCK_FILE,TW=process.env.CAMPAIGN_TWEET_ID||'1';
  const claim=async(w,act)=>(await fetch(`${BASE}/api/claim?wallet=${w}${act?'&act='+act:''}`,{method:act?'POST':'GET'})).json();
  const a=A.publicKey.toBase58();log('claimStatusBefore',await claim(a));
  let s=await pay(A,{t:'release',name:'No Claim',free:1},0);log('freeWithoutClaim',{res:await post(s)});
  const st=await claim(a,'code');log('claimCode',{code:!!st.code,remaining:st.remaining});
  if(!MOCK){log('claimSkipped','set X_MOCK_FILE to test the grant');return;}
  fs.writeFileSync(MOCK,JSON.stringify({data:[{id:'900',author_id:'u1',conversation_id:TW,referenced_tweets:[{type:'quoted',id:TW}],text:'joining '+st.code}],includes:{users:[{id:'u1',created_at:'2020-01-01T00:00:00Z',public_metrics:{followers_count:100}}]}}));
  await claim(a,'check');let g=null;for(let i=0;i<30&&!(g&&g.granted);i++){await new Promise(r=>setTimeout(r,1000));g=await claim(a);}log('claimGranted',{granted:g.granted,remaining:g.remaining,soldOut:g.soldOut});
  s=await pay(A,{t:'release',name:'Free One',free:1},0);log('freeRelease',{res:(await post(s)).ok});
  s=await pay(A,{t:'release',name:'Free Two',free:1},0);log('freeSecondTime',{res:await post(s)});
  const N=C.load('player3');await C.fund(N);const n=N.publicKey.toBase58();
  log('capSecondWalletCode',await claim(n,'code'));
  s=await pay(N,{t:'release',name:'Over Cap',free:1},0);log('freeOverCap',{res:await post(s)});}
const post=async sig=>(await fetch(BASE+'/api/submit',{method:'POST',body:JSON.stringify({sig})})).json();
(async()=>{
  const cfg=await (await fetch(BASE+'/api/config')).json();const T=new web3.PublicKey(cfg.treasury),MINT=new web3.PublicKey(cfg.mint);
  const treasury=C.load('treasury'),A=C.load('player'),B=C.load('player2');
  for(const k of [A,B])await C.fund(k);
  // give players some test tokens for burns
  const tAta=await spl.getOrCreateAssociatedTokenAccount(conn,treasury,MINT,treasury.publicKey);
  for(const k of [A,B]){const ata=await spl.getOrCreateAssociatedTokenAccount(conn,k,MINT,k.publicKey);await spl.transfer(conn,treasury,tAta.address,ata.address,treasury,10000n*1000000n);}
  const pay=async(kp,memo,lam,burn)=>{const ixs=[];if(lam)ixs.push(web3.SystemProgram.transfer({fromPubkey:kp.publicKey,toPubkey:T,lamports:lam}));
    if(burn){const ata=spl.getAssociatedTokenAddressSync(MINT,kp.publicKey);ixs.push(spl.createBurnInstruction(ata,MINT,kp.publicKey,BigInt(burn)*1000000n));}
    ixs.push(C.memoIx('primordial:v1:'+JSON.stringify(memo),kp.publicKey));return C.send(ixs,[kp]);};
  const out={};const log=(k,v)=>{out[k]=v;console.log(k,JSON.stringify(v));};
  if(process.env.CLAIM_ONLY){await claimFlow(A,pay,log);return;}
  let s=await pay(A,{t:'release',name:'Lantern Drifter',x:300,y:320},cfg.eco.priceLamports);log('releaseA',{sig:s,res:(await post(s)).ok});
  log('replaySameSig',await post(s));
  s=await pay(B,{t:'release',name:'Ash Weaver',x:620,y:560},cfg.eco.priceLamports);log('releaseB',{sig:s,res:(await post(s)).ok});
  s=await pay(B,{t:'release',name:'Under Price'},cfg.eco.priceLamports-10);log('releaseUnderPrice',{res:await post(s)});
  s=await pay(A,{t:'release',name:'Burn Paid'},0,cfg.eco.priceTokens);log('releaseByBurn',{res:(await post(s)).ok});
  await claimFlow(A,pay,log);
  s=await pay(A,{t:'food',x:310,y:330},cfg.prices.food);log('foodSol',{sig:s,res:(await post(s)).ok});
  s=await pay(B,{t:'food',x:600,y:560},0,50);log('foodBurn',{sig:s,res:(await post(s)).ok});
  s=await pay(A,{t:'meteor'},cfg.prices.meteor-1);log('underpaidMeteor',{sig:s,res:await post(s)});
  s=await pay(B,{t:'meteor',x:700,y:300},cfg.prices.meteor);log('meteor',{sig:s,res:(await post(s)).ok});
  s=await pay(A,{t:'meteor',x:300,y:300},cfg.prices.meteor);log('meteorCooldown',{res:await post(s)});
  // trait: wait until Lantern Drifter lineage is eligible for sense1 (gen 3)
  const led=await (await fetch(BASE+'/api/ledger')).json();const rel=led.recent.find(e=>e.name==='Lantern Drifter');
  let sp=null;for(let i=0;i<90;i++){const snap=await (await fetch(BASE+'/api/snapshot')).json();const S=snap.state.species.find(x=>x.released&&x.name==='Lantern Drifter'&&x.root===x.id);if(S){sp=S.id;const gens=snap.state.c.filter(k=>snap.state.species[k.sp].root===S.id).map(k=>k.gen);if(gens.length&&Math.max(...gens)>=3)break;}await new Promise(r=>setTimeout(r,2000));}
  s=await pay(B,{t:'trait',sp,trait:'sense1'},0,100);log('traitByNonOwner',{sig:s,res:await post(s)});
  s=await pay(A,{t:'trait',sp,trait:'sense1'},0,100);log('traitSense1',{sig:s,res:await post(s)});
  s=await pay(A,{t:'trait',sp,trait:'meta1'},0,100);log('traitMeta1',{sig:s,res:await post(s)});
  // wait for an hourly yield close and a payout transaction
  for(let i=0;i<60;i++){const l=await (await fetch(BASE+'/api/ledger')).json();if(l.eco.hours.some(h=>h.yield>0)&&l.eco.earned&&Object.keys(l.eco.earned).length){log('yieldHour',l.eco.hours.filter(h=>h.yield>0).slice(-1)[0]);log('earned',l.eco.earned);break;}await new Promise(r=>setTimeout(r,2000));}
  const b0=await conn.getBalance(A.publicKey);for(let i=0;i<40;i++){const l=await (await fetch(BASE+'/api/ledger')).json();if(l.eco&&(await conn.getBalance(A.publicKey))>b0){log('payoutReceivedLamports',(await conn.getBalance(A.publicKey))-b0);break;}await new Promise(r=>setTimeout(r,2000));}
  require('fs').writeFileSync(__dirname+'/data/e2e-result.json',JSON.stringify(out,null,1));
})().catch(e=>{console.error('E2E error',e.message);process.exit(1);});
