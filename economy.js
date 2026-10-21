'use strict';
// Survival economy (server side only; the deterministic sim is not involved except the newborn shield flag on release events).
// Pool inflows: 40% of intervention fees (and 70% of creator fees once a token exists). Payouts: 50% of the pool per day, paid hourly.
// Hourly yield (85%) is split by (creature-seconds alive this hour)^1.0 since v5 (0.6 before) per released lineage; free releases weigh 1/4 and together take at most 10%.
// A 15% slice accrues to a season bonus paid 50/30/20 to the top three lineages by season creature-seconds, minimum age 2 hours.
const E={
  HZ:+process.env.TICK_HZ||30,
  HOUR_TICKS:+process.env.HOUR_TICKS||108000, SEASON_HOURS:+process.env.SEASON_HOURS||24,
  PAYOUT_PER_DAY:0.5, YIELD_SHARE:0.85,WEIGHT_POW:0.6,WEIGHT_POW_V5:1.0,TARGET_ROI_V5:1.0, SPLIT:[0.5,0.3,0.2], BONUS_MIN_AGE_H:2,
  INTERV_TO_POOL:0.4, CREATOR_TO_POOL:0.7, TARGET_ROI:1.2, P_MIN:1, P_MAX:25, P_START:+process.env.P_START||5,
  FREE_WEIGHT:0.25, FREE_CAP:0.10, WALLET_CAP:0.10, MAX_PAID_PER_WALLET_DAY:10, FREE_MIN_USD:5, FREE_MIN_AGE_DAYS:7,
  SOL_USD:+process.env.SOL_USD||150, SHIELD_S:600,ZONE_BONUS:0.05,ZONE_MAX:3, COOLDOWN_S:{meteor:300,cold:180,toxic:180},
};
E.SOUP_USD=E.SOL_USD/(+process.env.MOCK_RATE||100000);
// v5 economy (from the same fixed tick as the sim v5 rule): weight exponent 1.0, release price target 1.0x
function v5(eco){return eco.v5bFrom!=null&&eco.lastTick>=eco.v5bFrom;}
function init(ledger){
  ledger.eco=ledger.eco||{price:E.P_START,yAvg:null,hour:{},season:{},born:{},free:{},owner:{},earned:{},cost:{},owed:{},bonusPot:0,
    day:{paidCost:0,paidPayout:0,paidN:0,walletPaid:{},walletEarned:{}},hours:[],seasons:[],sent:[],lastAt:{}};
  return ledger.eco;}
const usdToLam=u=>Math.round(u/E.SOL_USD*1e9);
const priceLamports=eco=>usdToLam(eco.price);
const priceTokens=eco=>Math.ceil(eco.price/E.SOUP_USD);
function onRelease(eco,ev,tick,costUsd){const r=ev.sp;eco.born[r]=tick;eco.owner[r]=ev.owner;if(ev.free)eco.free[r]=1;eco.cost[r]=costUsd||0;
  if(!ev.free){eco.day.paidCost+=costUsd;eco.day.paidN++;eco.day.walletPaid[ev.owner]=(eco.day.walletPaid[ev.owner]||0)+1;}}
// every second of game time (HZ ticks): credit creature-seconds to each released lineage root
function accrue(eco,W){const cnt=new Map();for(const k of W.c){const ro=W.species[k.sp].root;if(eco.owner[ro]!==undefined)cnt.set(ro,(cnt.get(ro)||0)+1);}
  eco.hz=eco.hz||{};eco.hs=eco.hs||{};
  for(const [r,n] of cnt){eco.hour[r]=(eco.hour[r]||0)+n;eco.season[r]=(eco.season[r]||0)+n;
    // territory: average zones held over the hour lifts the hourly yield weight by 5% per zone, at most 3 zones. The daily top-3 bonus ignores zones.
    const z=W.zonesOf?Math.min(E.ZONE_MAX,W.zonesOf(+r)):0;eco.hz[r]=(eco.hz[r]||0)+z;eco.hs[r]=(eco.hs[r]||0)+1;}}
const zoneMult=(eco,r)=>1+E.ZONE_BONUS*((eco.hz&&eco.hs&&eco.hs[r])?eco.hz[r]/eco.hs[r]:0);
// weight = creature-seconds to the power 1.0 since v5 (0.6 before, see econ/SURVIVAL_NOTES.md)
function weights(eco){const ent=[];let paid=0,free=0;for(const r in eco.hour){const w=Math.pow(eco.hour[r],v5(eco)?E.WEIGHT_POW_V5:E.WEIGHT_POW)*zoneMult(eco,r);if(eco.free[r]){free+=w*E.FREE_WEIGHT;ent.push([r,w*E.FREE_WEIGHT,1]);}else{paid+=w;ent.push([r,w,0]);}}
  let fs=1;if(free>0&&free/(paid+free)>E.FREE_CAP)fs=paid>0?(E.FREE_CAP*paid/(1-E.FREE_CAP))/free:1;
  const out=ent.map(([r,w,f])=>[r,f?w*fs:w]);const tot=out.reduce((a,b)=>a+b[1],0);return {out,tot};}
function closeHour(eco,ledger,tick){
  const budget=Math.floor(ledger.pool*E.PAYOUT_PER_DAY/24),yb=Math.floor(budget*E.YIELD_SHARE);
  const {out,tot}=weights(eco);const rec={tick,budget,yield:0,lineages:out.length,returned:0};
  if(tot>0&&budget>0){ledger.pool-=budget;eco.bonusPot+=budget-yb;
    const wallets=new Set(out.map(o=>eco.owner[o[0]]));const cap=Math.max(E.WALLET_CAP,1/wallets.size)*yb*E.SEASON_HOURS;
    for(const [r,w] of out){let lam=Math.floor(yb*w/tot);const o=eco.owner[r];const had=eco.day.walletEarned[o]||0;
      if(had+lam>cap){const ok=Math.max(0,Math.floor(cap-had));rec.returned+=lam-ok;lam=ok;}
      if(lam<=0)continue;eco.day.walletEarned[o]=had+lam;eco.earned[r]=(eco.earned[r]||0)+lam;eco.owed[o]=(eco.owed[o]||0)+lam;rec.yield+=lam;
      if(!eco.free[r])eco.day.paidPayout+=lam/1e9*E.SOL_USD;}
    ledger.pool+=rec.returned+(yb-rec.yield-rec.returned);} // rounding dust and capped excess return to the pool
  eco.hours.push(rec);if(eco.hours.length>48)eco.hours.shift();eco.hour={};eco.hz={};eco.hs={};
  // forget lineages that died long ago
  return rec;}
function closeSeason(eco,ledger,tick,W){
  const minAge=E.BONUS_MIN_AGE_H*E.HOUR_TICKS;const sc=r=>eco.season[r]*(eco.free[r]?E.FREE_WEIGHT:1);const cand=Object.keys(eco.season).filter(r=>tick-eco.born[r]>=minAge).sort((a,b)=>sc(b)-sc(a)||a-b).slice(0,3);
  const pot=eco.bonusPot,wins=[];
  cand.forEach((r,i)=>{const lam=Math.floor(pot*E.SPLIT[i]);const o=eco.owner[r];eco.owed[o]=(eco.owed[o]||0)+lam;eco.earned[r]=(eco.earned[r]||0)+lam;eco.bonusPot-=lam;
    if(!eco.free[r])eco.day.paidPayout+=lam/1e9*E.SOL_USD;wins.push({place:i+1,sp:+r,name:(W.species[r]||{}).name,owner:o,lamports:lam,cs:eco.season[r]});});
  // daily price: yesterday's payout per paid release divided by the target return, clamped
  const d=eco.day;if(d.paidCost>0)eco.yAvg=d.paidPayout/d.paidCost;
  if(d.paidN>0)eco.price=Math.min(E.P_MAX,Math.max(E.P_MIN,d.paidPayout/d.paidN/(v5(eco)?E.TARGET_ROI_V5:E.TARGET_ROI)));
  eco.seasons.push({tick,wins,price:eco.price,yAvg:eco.yAvg,paidN:d.paidN});if(eco.seasons.length>30)eco.seasons.shift();
  eco.day={paidCost:0,paidPayout:0,paidN:0,walletPaid:{},walletEarned:{}};eco.season={};eco.freeDay={};
  for(const r of Object.keys(eco.owner))if(!W.species[r]||W.lineageStats(+r).alive===0){if(tick-eco.born[r]>E.HOUR_TICKS){delete eco.owner[r];delete eco.free[r];delete eco.born[r];}}
  return wins;}
function onTick(eco,ledger,W){
  if(W.tick%E.HZ===0)accrue(eco,W);
  let h=null,s=null;if(W.tick%E.HOUR_TICKS===0){h=closeHour(eco,ledger,W.tick);if(W.tick%(E.HOUR_TICKS*E.SEASON_HOURS)===0)s=closeSeason(eco,ledger,W.tick,W);}
  return {h,s};}
function cooldown(eco,type,now){const c=E.COOLDOWN_S[type];if(!c)return 0;const last=eco.lastAt[type]||0;return Math.max(0,Math.ceil((last+c*1000-now)/1000));}
function publicView(eco,ledger){const {out,tot}=weights(eco);const budget=Math.floor(ledger.pool*E.PAYOUT_PER_DAY/24)*E.YIELD_SHARE;
  const est={};for(const [r,w] of out)est[r]=tot>0?Math.floor(budget*w/tot):0;
  return {price:eco.price,priceLamports:priceLamports(eco),priceTokens:priceTokens(eco),yAvg:eco.yAvg,solUsd:E.SOL_USD,bonusPot:eco.bonusPot,hourBudget:budget,est,earned:eco.earned,free:eco.free,
    hours:eco.hours.slice(-6),seasons:eco.seasons.slice(-4),cooldown:{meteor:cooldown(eco,'meteor',Date.now()),cold:cooldown(eco,'cold',Date.now()),toxic:cooldown(eco,'toxic',Date.now())},
    rules:{hourTicks:E.HOUR_TICKS,seasonHours:E.SEASON_HOURS,freeWeight:E.FREE_WEIGHT,freeCap:E.FREE_CAP,walletCap:E.WALLET_CAP,shieldS:E.SHIELD_S,zoneBonus:E.ZONE_BONUS,zoneMax:E.ZONE_MAX,maxPaid:E.MAX_PAID_PER_WALLET_DAY,targetRoi:v5(eco)?E.TARGET_ROI_V5:E.TARGET_ROI,weightPow:v5(eco)?E.WEIGHT_POW_V5:E.WEIGHT_POW,pMin:E.P_MIN,pMax:E.P_MAX,freeMinUsd:E.FREE_MIN_USD,freeMinAgeDays:E.FREE_MIN_AGE_DAYS,bonusMinAgeH:E.BONUS_MIN_AGE_H}};}
module.exports={E,init,usdToLam,priceLamports,priceTokens,onRelease,onTick,cooldown,publicView,weights};
