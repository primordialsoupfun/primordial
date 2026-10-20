// Free microbe claim test against a local server started with CLAIM_OPEN=1 CAMPAIGN_TWEET_ID=<id> X_MOCK_FILE=<path>. Never prints keys.
const C=require('./chain.js');const {web3,conn}=C;const fs=require('fs');
const BASE=process.env.BASE||'http://localhost:8765',MOCK=process.env.X_MOCK_FILE,TW=process.env.CAMPAIGN_TWEET_ID;
const j=async(p,m)=>(await fetch(BASE+p,{method:m||'GET'})).json();
(async()=>{const cfg=await j('/api/config');const T=new web3.PublicKey(cfg.treasury);
  const A=C.load('claimer'),B=C.load('claimer2');for(const k of [A,B])await C.fund(k);
  const pay=async(kp,memo)=>C.send([C.memoIx('primordial:v1:'+JSON.stringify(memo),kp.publicKey)],[kp]);
  const post=async sig=>(await fetch(BASE+'/api/submit',{method:'POST',body:JSON.stringify({sig})})).json();
  const sig=(kp,msg)=>{const k=require('crypto').createPrivateKey({key:{kty:'OKP',crv:'Ed25519',d:Buffer.from(kp.secretKey.slice(0,32)).toString('base64url'),x:Buffer.from(kp.publicKey.toBytes()).toString('base64url')},format:'jwk'});return encodeURIComponent(require('crypto').sign(null,Buffer.from(msg),k).toString('base64'));};
  const log=(k,v)=>console.log(k,JSON.stringify(v));
  log('freeBeforeClaim',(await post(await pay(A,{t:'release',name:'Too Early',free:1}))).error);
  log('noSig',(await j('/api/claim?act=code&wallet='+A.publicKey,'POST')).error);const M=require('./claims.js').bindMsg;log('badSig',(await j('/api/claim?act=code&wallet='+A.publicKey+'&sig='+sig(B,M(A.publicKey.toString())),'POST')).error);
  const a=await j('/api/claim?act=code&wallet='+A.publicKey+'&sig='+sig(A,M(A.publicKey.toString())),'POST');const b=await j('/api/claim?act=code&wallet='+B.publicKey+'&sig='+sig(B,M(B.publicKey.toString())),'POST');log('codes',[!!a.code,!!b.code,a.code!==b.code]);
  const old=new Date(Date.now()-90*864e5).toISOString(),young=new Date(Date.now()-3*864e5).toISOString();
  fs.writeFileSync(MOCK,JSON.stringify({data:[{id:'t1',author_id:'u1',text:'joining '+a.code,referenced_tweets:[{type:'quoted',id:TW}]},{id:'t2',author_id:'u2',text:'me too '+b.code,conversation_id:TW,referenced_tweets:[{type:'replied_to',id:TW}]}],
    includes:{users:[{id:'u1',created_at:old,public_metrics:{followers_count:40}},{id:'u2',created_at:young,public_metrics:{followers_count:400}}]}}));
  await j('/api/claim?act=check&wallet='+A.publicKey,'POST');await j('/api/claim?act=check&wallet='+B.publicKey,'POST');
  let sa,sb;for(let i=0;i<30;i++){sa=await j('/api/claim?wallet='+A.publicKey);sb=await j('/api/claim?wallet='+B.publicKey);if(!sa.pending&&!sb.pending)break;await new Promise(r=>setTimeout(r,1000));}
  log('claimA',{granted:sa.granted,reason:sa.reason});log('claimB_youngAccount',{granted:sb.granted,reason:sb.reason});
  log('freeRelease',(await post(await pay(A,{t:'release',name:'Claimed One',free:1}))).ok);
  log('freeSecond',(await post(await pay(A,{t:'release',name:'Claimed Two',free:1}))).error);
  const led=await j('/api/ledger');log('claimStats',led.claim);
})().catch(e=>{console.error('E2E error',e.message);process.exit(1);});
