// Ambient music. Visual/audio only; never touches the simulation.
// Seamless loop via Web Audio. Default on at 35 percent. Starts on first interaction if autoplay is blocked.
(function(){
'use strict';
const SRC='/audio/ambient.mp3?v='+((document.currentScript&&document.currentScript.src.split('v=')[1])||'1');
const KEY='primordial.sound',VOL=0.35,btn=document.getElementById('sound');
let on=localStorage.getItem(KEY)!=='off',ctx=null,gain=null,started=false,loading=null;
function paint(){btn.setAttribute('aria-pressed',on?'true':'false');btn.title=on?'Sound on':'Sound off';}
function load(){if(loading)return loading;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return Promise.reject();
  ctx=new AC();gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);
  loading=fetch(SRC).then(r=>r.arrayBuffer()).then(b=>new Promise((res,rej)=>ctx.decodeAudioData(b,res,rej)))
    .then(buf=>{const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.connect(gain);s.start(0);started=true;});return loading;}
function fade(to,sec){if(!gain)return;const t=ctx.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(to,t+sec);}
async function start(){if(!on)return;try{await load();if(ctx.state==='suspended')await ctx.resume();if(ctx.state==='running'){fade(VOL,2.5);detach();}}catch(e){}}
const evs=['pointerdown','keydown','touchstart','wheel','scroll'];
function onFirst(){start();}
function detach(){evs.forEach(e=>window.removeEventListener(e,onFirst,true));}
evs.forEach(e=>window.addEventListener(e,onFirst,{capture:true,passive:true}));
btn.addEventListener('click',async e=>{e.stopPropagation();on=!on;localStorage.setItem(KEY,on?'on':'off');paint();
  if(on){await start();}else if(gain){fade(0,0.6);}});
document.addEventListener('visibilitychange',()=>{if(!ctx||!on)return;if(document.hidden)fade(0,.4);else if(ctx.state==='running')fade(VOL,1.2);});
paint();if(on)start();
window.__audio=()=>({on,state:ctx&&ctx.state,started,gain:gain&&gain.gain.value});
})();
