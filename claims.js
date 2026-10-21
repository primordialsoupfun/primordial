'use strict';
// Free microbe claim through an X share. Closed until launch (CLAIM_OPEN=1). While closed: no codes are issued and the X API is never called.
// Flow: wallet asks for a code bound to it; the player quotes or replies to the campaign post from their own X account with the code;
// the server batches all pending codes into one recent-search query per poll, checks the author (account age, followers) and grants one free release.
// Limits: one claim per wallet and per X account, lifetime. First CLAIM_MAX wallets. Daily X API spend cap. The bearer token is read from env and never logged.
const crypto=require('crypto');
const C={OPEN:process.env.CLAIM_OPEN==='1',TWEET:process.env.CAMPAIGN_TWEET_ID||'',MAX:+process.env.CLAIM_MAX||500,
  MIN_AGE_DAYS:+process.env.X_MIN_AGE_DAYS||30,MIN_FOLLOWERS:+(process.env.X_MIN_FOLLOWERS||5),
  POLL_S:+process.env.CLAIM_POLL_S||60,DAILY_USD:+(process.env.X_DAILY_SPEND_USD||2),
  POST_USD:0.005,USER_USD:0.010, // X pay-per-use read prices (posts, users), per resource returned
  BATCH:15,PENDING_H:24,MOCK:process.env.X_MOCK_FILE||'',
  HANDLE:(process.env.CAMPAIGN_X_HANDLE||'primordialfun').replace(/[^A-Za-z0-9_]/g,'').slice(0,15),
  COPY:process.env.CAMPAIGN_COPY||'First 500 Solana wallets get a free microbe in the Soup, the first shared petri dish. My code: {code} Claim yours at primordialsoup.fun/claim',
  REPLY:process.env.CAMPAIGN_REPLY_COPY||'First 500 Solana wallets. Count my microbe in. My code: {code} primordialsoup.fun/claim'};
// Wallet binding: the player signs this plain message (no transaction, no fee). Verified with Node's built-in Ed25519.
const bindMsg=w=>`Primordial free microbe claim\nBind a claim code to wallet ${w}\nThis is a signature only. It is not a transaction and costs nothing.`;
function verifySig(wallet,sigB58){try{const bs58=require('bs58');const dec=(bs58.default||bs58).decode;const pk=Buffer.from(dec(wallet)),sig=Buffer.from(String(sigB58||''),'base64');
  if(pk.length!==32||sig.length!==64)return false;const key=crypto.createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:pk.toString('base64url')},format:'jwk'});
  return crypto.verify(null,Buffer.from(bindMsg(wallet)),key,sig);}catch(e){return false;}}
const releaseMsg=(w,code,name)=>`Primordial free microbe release\nWallet ${w}\nClaim code ${code}\nName ${name}\nThis is a signature only. It is not a transaction and costs nothing.`;
function verifyMsg(wallet,msg,sigB64){try{const bs58=require('bs58');const pk=Buffer.from((bs58.default||bs58).decode(wallet)),sig=Buffer.from(String(sigB64||''),'base64');if(pk.length!==32||sig.length!==64)return false;
  return crypto.verify(null,Buffer.from(msg),crypto.createPublicKey({key:{kty:'OKP',crv:'Ed25519',x:pk.toString('base64url')},format:'jwk'}),sig);}catch(e){return false;}}
function init(ledger){ledger.claims=ledger.claims||{codes:{},byCode:{},pending:{},granted:{},xUsed:{},reasons:{},spend:{},calls:0,count:0};const cl=ledger.claims;cl.names=cl.names||{};return cl;}
const day=()=>new Date().toISOString().slice(0,10);
const isOpen=()=>C.OPEN&&!!C.TWEET;
const codesOpen=()=>C.OPEN; // partial open: wallet binding and codes before the launch post exists; X checks stay off until CAMPAIGN_TWEET_ID is set
function status(cl,wallet){const g=cl.granted[wallet];
  return {wallet:wallet||null,open:isOpen(),codesOpen:codesOpen(),max:C.MAX,claimed:cl.count,remaining:Math.max(0,C.MAX-cl.count),soldOut:cl.count>=C.MAX,tweet:C.TWEET||null,minAgeDays:C.MIN_AGE_DAYS,minFollowers:C.MIN_FOLLOWERS,handle:C.HANDLE||null,bindMsg:wallet?bindMsg(wallet):null,copy:C.COPY,replyCopy:C.REPLY,
    code:wallet&&codesOpen()?cl.codes[wallet]||null:null,pending:!!(wallet&&cl.pending[wallet]),granted:!!g,used:!!(g&&g.used),releaseOpen:process.env.FREE_RELEASE_OPEN==='1',reservedName:(g&&g.name)||cl.names[wallet]||null,claimNo:g?Object.values(cl.granted).filter(x=>x.at<=g.at).length:null,cardUrl:wallet&&cl.codes[wallet]?'/c/'+cl.codes[wallet]:null,lastPoll:cl.lastPoll||null,pendingSince:wallet&&cl.pending[wallet]||null,reason:wallet?cl.reasons[wallet]||null:null};}
function issue(cl,wallet,sig){if(!codesOpen())throw new Error('Free microbe claim opens at launch.');
  if(!cl.codes[wallet]&&!verifySig(wallet,sig))throw new Error('Sign the message in your wallet to get your code.');
  if(cl.granted[wallet])return cl.codes[wallet];if(cl.count>=C.MAX)throw new Error('All free microbes have been claimed.');
  if(!cl.codes[wallet]){let c;do{c='SOUP'+crypto.randomBytes(4).toString('hex').toUpperCase().slice(0,6);}while(cl.byCode[c]);cl.codes[wallet]=c;cl.byCode[c]=wallet;}
  return cl.codes[wallet];}
function check(cl,wallet){if(!isOpen())throw new Error('Free microbe claim opens at launch.');if(!cl.codes[wallet])throw new Error('Get your code first.');if(!cl.granted[wallet]&&cl.count>=C.MAX)throw new Error('All free microbes have been claimed.');
  if(!cl.granted[wallet]){cl.pending[wallet]=Date.now();delete cl.reasons[wallet];}return status(cl,wallet);}
async function search(query){
  if(C.MOCK)return JSON.parse(require('fs').readFileSync(C.MOCK,'utf8'));
  const u='https://api.x.com/2/tweets/search/recent?'+new URLSearchParams({query,max_results:'100','tweet.fields':'author_id,referenced_tweets,conversation_id,text,note_tweet',expansions:'author_id','user.fields':'created_at,public_metrics'});
  const r=await fetch(u,{headers:{authorization:'Bearer '+process.env.X_BEARER_TOKEN}});if(!r.ok)throw new Error('X search failed with status '+r.status);return r.json();}
async function poll(cl,save){if(!isOpen())return;const now=Date.now();
  for(const w of Object.keys(cl.pending))if(now-cl.pending[w]>C.PENDING_H*3600e3){delete cl.pending[w];cl.reasons[w]='We could not find your post within 24 hours. Post it, then press Check again.';}
  const waiting=Object.keys(cl.pending).slice(0,C.BATCH);if(!waiting.length)return;
  const d=day();if((cl.spend[d]||0)>=C.DAILY_USD)return; // daily cap: pending claims wait for tomorrow
  cl.lastPoll=Date.now();const codes=waiting.map(w=>cl.codes[w]);
  const q=`(${codes.join(' OR ')}) (conversation_id:${C.TWEET} OR url:${C.TWEET}) -is:retweet`;
  let res;try{res=await search(q);}catch(e){console.error('claim poll:',e.message);return;}
  const tweets=res.data||[],users=new Map(((res.includes||{}).users||[]).map(u=>[u.id,u]));
  cl.calls++;cl.spend[d]=(cl.spend[d]||0)+tweets.length*C.POST_USD+users.size*C.USER_USD;
  for(const t of tweets){const ref=(t.referenced_tweets||[]).some(r=>r.id===C.TWEET)||t.conversation_id===C.TWEET;if(!ref)continue;
    const m=String((t.note_tweet&&t.note_tweet.text)||t.text||'').toUpperCase().match(/SOUP[0-9A-F]{6}/g)||[];
    for(const code of m){const w=cl.byCode[code];if(!w||!cl.pending[w])continue;const u=users.get(t.author_id);
      const fail=r=>{cl.reasons[w]=r;delete cl.pending[w];};
      if(!u){fail('We could not read your X account. Try again later.');continue;}
      if(cl.xUsed[u.id]&&cl.xUsed[u.id]!==w){fail('This X account has already claimed a free microbe.');continue;}
      const age=(now-Date.parse(u.created_at))/86400e3;if(!(age>=C.MIN_AGE_DAYS)){fail(`Your X account must be at least ${C.MIN_AGE_DAYS} days old.`);continue;}
      if(((u.public_metrics||{}).followers_count||0)<C.MIN_FOLLOWERS){fail(`Your X account needs at least ${C.MIN_FOLLOWERS} followers.`);continue;}
      if(cl.count>=C.MAX){fail('All free microbes have been claimed.');continue;}
      cl.granted[w]={x:u.id,tweet:t.id,at:new Date().toISOString(),used:false,name:cl.names[w]||undefined};cl.xUsed[u.id]=w;cl.count++;delete cl.pending[w];delete cl.reasons[w];}}
  save();}
function consume(cl,wallet){const g=cl.granted[wallet];if(!isOpen())throw new Error('Free microbe claim opens at launch. First 500 Solana wallets.');
  if(!g)throw new Error('Claim your free microbe first: share the campaign post on X with your code.');if(g.used)throw new Error('Your free microbe has already been released.');return g;}
function lookup(cl,code){code=String(code||'').toUpperCase();const w=cl.byCode[code];if(!w)return null;const g=cl.granted[w];return {code,wallet:w,granted:!!g,used:!!(g&&g.used),grantedAt:g&&g.at||null,reservedName:g&&g.name||null};}
function publicStats(cl){return {open:isOpen(),codesOpen:codesOpen(),max:C.MAX,claimed:cl.count,remaining:Math.max(0,C.MAX-cl.count),pending:Object.keys(cl.pending).length,calls:cl.calls,spendToday:+(cl.spend[day()]||0).toFixed(3)};}
module.exports={lookup,releaseMsg,verifyMsg,C,bindMsg,verifySig,init,status,issue,check,poll,consume,publicStats,isOpen};
