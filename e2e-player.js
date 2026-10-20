// End-to-end player test on the configured cluster (local validator by default). Never prints keys.
const C=require('./chain.js');const {web3,spl,conn}=C;
const BASE=process.env.BASE||'http://localhost:8765';
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
  let s=await pay(A,{t:'release',name:'Lantern Drifter',x:300,y:320},cfg.prices.release);log('releaseA',{sig:s,res:(await post(s)).ok});
  log('replaySameSig',await post(s));
  s=await pay(B,{t:'release',name:'Ash Weaver',x:620,y:560},cfg.prices.release);log('releaseB',{sig:s,res:(await post(s)).ok});
  s=await pay(A,{t:'food',x:310,y:330},cfg.prices.food);log('foodSol',{sig:s,res:(await post(s)).ok});
  s=await pay(B,{t:'food',x:600,y:560},0,50);log('foodBurn',{sig:s,res:(await post(s)).ok});
  s=await pay(A,{t:'meteor'},cfg.prices.meteor-1);log('underpaidMeteor',{sig:s,res:await post(s)});
  s=await pay(B,{t:'meteor',x:700,y:300},cfg.prices.meteor);log('meteor',{sig:s,res:(await post(s)).ok});
  // trait: wait until Lantern Drifter lineage is eligible for sense1 (gen 3)
  const led=await (await fetch(BASE+'/api/ledger')).json();const rel=led.recent.find(e=>e.name==='Lantern Drifter');
  let sp=null;for(let i=0;i<90;i++){const snap=await (await fetch(BASE+'/api/snapshot')).json();const S=snap.state.species.find(x=>x.released&&x.name==='Lantern Drifter'&&x.root===x.id);if(S){sp=S.id;const gens=snap.state.c.filter(k=>snap.state.species[k.sp].root===S.id).map(k=>k.gen);if(gens.length&&Math.max(...gens)>=3)break;}await new Promise(r=>setTimeout(r,2000));}
  s=await pay(B,{t:'trait',sp,trait:'sense1'},0,100);log('traitByNonOwner',{sig:s,res:await post(s)});
  s=await pay(A,{t:'trait',sp,trait:'sense1'},0,100);log('traitSense1',{sig:s,res:await post(s)});
  s=await pay(A,{t:'trait',sp,trait:'meta1'},0,100);log('traitMeta1',{sig:s,res:await post(s)});
  require('fs').writeFileSync(__dirname+'/data/e2e-result.json',JSON.stringify(out,null,1));
})().catch(e=>{console.error('E2E error',e.message);process.exit(1);});
