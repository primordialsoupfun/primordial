// Haeckel-plate style procedural organism renderer. Visual only, never touches sim state.
(function(g){
'use strict';
function hashG(gen,salt){let h=2166136261^salt;for(let i=0;i<gen.length;i+=3){h^=Math.round(gen[i]*1000);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
const cache=new Map();
function plan(S,root){const key=S.id+':'+S.traits.join(',');let p=cache.get(key);if(p)return p;
  const h=hashG(root.g,7),v=hashG(S.g,11);const f=(x,n)=>((x>>>n)&255)/255;
  p={type:h%5,aspect:1.25+f(h,3)*.9,segs:3+(h>>>5)%4,spikes:9+(h>>>9)%10,cilia:18+(v>>>4)%14,stri:5+(h>>>13)%6,
     wob:f(v,8)*.18,nuc:.28+f(v,16)*.12,org:2+(v>>>20)%4,col:S.col,t:new Set(S.traits)};
  cache.set(key,p);return p;}
const ink=(c,a)=>`rgba(${c[0]*.42|0},${c[1]*.42|0},${c[2]*.42|0},${a})`,wash=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
function body(c,p,ph){ // path in local units, radius ~1, facing +x
  const T=p.type;c.beginPath();
  if(T===0||T===4){const n=28;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a);
      const taper=T===4?(cs<0?.55+.45*(1+cs)*.0+.45:1):1;const rx=p.aspect*(cs>0?1:(T===4?1.25:1)),ry=(T===4?.62:.68)*(1+p.wob*Math.sin(a*3+ph*.3))*(T===4&&cs<0?(.4+.6*(1+cs)):1);
      const x=cs*rx,y=sn*ry;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();}
  else if(T===1){c.arc(0,0,1,0,Math.PI*2);}
  else if(T===2){const n=p.segs;for(let s=0;s<n;s++){const r=.78*(1-s*.13),x=.9-s*.62;c.moveTo(x+r,0);c.ellipse(x,0,r*.75,r,0,0,Math.PI*2);}}
  else{c.ellipse(0,0,p.aspect*1.05,.5,0,0,Math.PI*2);}
}
function draw(c,k,S,root,s,z,tick,detail){
  const p=plan(S,root),px=s*z,ang=Math.atan2(k.dy,k.dx),ph=tick*.35+k.id*1.7,sp=Math.min(1.5,k.v||0);
  c.save();c.translate(k.x,k.y);c.rotate(ang);c.scale(s,s);
  const lw=w=>w/(px);
  if(px<2.6||detail===0){c.fillStyle=wash(p.col,.85);c.beginPath();c.ellipse(0,0,1.2,.75,0,0,6.283);c.fill();c.restore();return;}
  const full=px>=7;
  // locomotory appendages behind the membrane
  c.strokeStyle=ink(p.col,.55);c.lineWidth=lw(.6);
  const flag=(len,off)=>{c.beginPath();c.moveTo(-p.aspect*.95,off);for(let i=1;i<=10;i++){const t=i/10;c.lineTo(-p.aspect*.95-t*len,off+Math.sin(ph*1.6-t*6)*.28*t*(.6+sp));}c.stroke();};
  if(p.type===4||p.t.has('loco1')){const L=p.t.has('loco1')?3.2:2.2;flag(L,0);if(p.t.has('loco2'))flag(L*.9,.25);}
  else if(p.type===2){flag(1.2,0);}
  // membrane
  body(c,p,ph);
  const gr=c.createRadialGradient(-.25,-.3,.05,0,0,1.4);gr.addColorStop(0,wash(p.col,.12));gr.addColorStop(.7,wash(p.col,.34));gr.addColorStop(1,wash(p.col,.5));
  c.fillStyle=gr;c.fill();c.strokeStyle=ink(p.col,.9);c.lineWidth=lw(p.t.has('armor1')?1.1:.75);c.stroke();
  if(p.t.has('armor1')&&full){c.save();c.scale(1.12,1.18);body(c,p,ph);c.restore();c.lineWidth=lw(.45);c.stroke();}
  if(full){
    // cilia fringe for ciliates, spines for radiolarians
    if(p.type===0){c.strokeStyle=ink(p.col,.45);c.lineWidth=lw(.4);c.beginPath();for(let i=0;i<p.cilia;i++){const a=i/p.cilia*6.283,cs=Math.cos(a),sn=Math.sin(a),x=cs*p.aspect,y=sn*.68,w=Math.sin(ph*2+i*.7)*.12;
        c.moveTo(x,y);c.lineTo(x*1.17+w*sn,y*1.32-w*cs);}c.stroke();}
    if(p.type===1){c.strokeStyle=ink(p.col,.6);c.lineWidth=lw(.45);c.beginPath();for(let i=0;i<p.spikes;i++){const a=i/p.spikes*6.283+Math.sin(ph*.4)*.03;c.moveTo(Math.cos(a),Math.sin(a));c.lineTo(Math.cos(a)*1.7,Math.sin(a)*1.7);}c.stroke();
      c.beginPath();c.arc(0,0,.62,0,6.283);c.lineWidth=lw(.35);c.stroke();
      c.beginPath();for(let i=0;i<p.spikes;i++){const a=i/p.spikes*6.283;c.moveTo(Math.cos(a)*.62,Math.sin(a)*.62);c.lineTo(Math.cos(a),Math.sin(a));}c.stroke();}
    if(p.type===3){c.save();body(c,p,ph);c.clip();c.strokeStyle=ink(p.col,.35);c.lineWidth=lw(.35);c.beginPath();for(let i=-p.stri;i<=p.stri;i++){const x=i/p.stri*p.aspect;c.moveTo(x,-.6);c.lineTo(x,.6);}c.stroke();c.restore();
      c.beginPath();c.moveTo(-p.aspect,0);c.lineTo(p.aspect,0);c.lineWidth=lw(.5);c.strokeStyle=ink(p.col,.5);c.stroke();}
    if(p.type===2){c.strokeStyle=ink(p.col,.4);c.lineWidth=lw(.4);c.beginPath();c.moveTo(1.55,-.35);c.lineTo(1.85+Math.sin(ph*2)*.08,-.55);c.moveTo(1.55,.35);c.lineTo(1.85-Math.sin(ph*2)*.08,.55);c.stroke();}
    // organelles
    c.fillStyle=ink(p.col,.18);for(let i=0;i<p.org+(p.t.has('meta1')?3:0);i++){const a=i*2.4+k.id,r=.35+((i*37)%10)/30;c.beginPath();c.arc(Math.cos(a)*r*p.aspect*.6,Math.sin(a)*r*.4,.09,0,6.283);c.fill();}
    if(p.t.has('meta2')){c.strokeStyle=ink(p.col,.4);c.lineWidth=lw(.35);for(let i=0;i<3;i++){c.beginPath();c.arc(-.4+i*.25,(i%2?.18:-.2),.13,0,6.283);c.stroke();}}
    if(p.t.has('symb')){c.fillStyle='rgba(86,110,58,.75)';for(let i=0;i<6;i++){const a=i*1.05+.3;c.beginPath();c.arc(Math.cos(a)*.45*p.aspect*.7,Math.sin(a)*.32,.07,0,6.283);c.fill();}}
    if(p.t.has('armor2')){c.save();body(c,p,ph);c.clip();c.strokeStyle=ink(p.col,.3);c.lineWidth=lw(.35);c.beginPath();for(let x=-2;x<2;x+=.32)for(let y=-1;y<1;y+=.28){c.moveTo(x+.1,y);c.arc(x,y+(Math.round(x/.32)%2?.14:0),.1,0,6.283);}c.stroke();c.restore();}
    if(p.t.has('res1')){c.setLineDash([lw(1),lw(2)]);c.strokeStyle=ink(p.col,.5);c.lineWidth=lw(.45);c.beginPath();c.ellipse(0,0,p.type===1?1.25:p.aspect*1.22,p.type===1?1.25:.92,0,0,6.283);c.stroke();c.setLineDash([]);}
    if(p.t.has('res2')){c.strokeStyle=ink(p.col,.3);c.lineWidth=lw(.3);c.beginPath();for(let i=0;i<40;i++){const a=i/40*6.283;c.moveTo(Math.cos(a)*p.aspect*1.25,Math.sin(a)*.95);c.lineTo(Math.cos(a)*p.aspect*1.34,Math.sin(a)*1.03);}c.stroke();}
    if(p.t.has('pred')){c.fillStyle=ink(p.col,.85);c.beginPath();const fx=p.type===1?1:p.aspect;c.moveTo(fx*.92,-.18);for(let i=0;i<5;i++){c.lineTo(fx*1.12,-.14+i*.08);c.lineTo(fx*.95,-.1+i*.08);}c.closePath();c.fill();}
    if(p.t.has('sense1')||p.type===4){c.fillStyle='rgba(150,62,40,.85)';c.beginPath();c.arc((p.type===1?.55:p.aspect*.62),-.12,.1,0,6.283);c.fill();}
    if(p.t.has('sense2')){c.strokeStyle=ink(p.col,.6);c.lineWidth=lw(.45);c.beginPath();const fx=p.type===1?1:p.aspect;c.moveTo(fx*.9,-.2);c.quadraticCurveTo(fx*1.4,-.6,fx*1.8,-.5+Math.sin(ph)*.05);c.moveTo(fx*.9,.2);c.quadraticCurveTo(fx*1.4,.6,fx*1.8,.5-Math.sin(ph)*.05);c.stroke();}
  }
  // nucleus with nucleolus
  c.fillStyle=ink(p.col,.22);c.strokeStyle=ink(p.col,.7);c.lineWidth=lw(.5);c.beginPath();c.ellipse(p.type===2?.9:.1,0,p.nuc*1.2,p.nuc,0,0,6.283);c.fill();if(full)c.stroke();
  if(full){c.fillStyle=ink(p.col,.85);c.beginPath();c.arc(p.type===2?.95:.15,-.03,p.nuc*.32,0,6.283);c.fill();}
  // energy shown as density of a faint inner reserve
  c.restore();
}
function algae(c,f,i,z){const px=z;c.save();c.translate(f.x,f.y);
  if(px<1.4){c.fillStyle='rgba(86,97,61,.55)';c.beginPath();c.arc(0,0,1.1,0,6.283);c.fill();c.restore();return;}
  const t=i%3;c.rotate((i*2.39)%6.283);c.strokeStyle='rgba(76,92,52,.7)';c.fillStyle='rgba(118,134,82,.45)';c.lineWidth=.35;
  if(t===0){for(let j=0;j<3;j++){c.beginPath();c.arc(j*1.3-1.3,Math.sin(j)*.4,.62,0,6.283);c.fill();c.stroke();}}
  else if(t===1){c.beginPath();c.moveTo(-2,0);c.quadraticCurveTo(0,-1.4,2,0);c.stroke();c.beginPath();c.arc(2,0,.4,0,6.283);c.fill();}
  else{c.beginPath();c.arc(0,0,.9,0,6.283);c.fill();c.stroke();c.beginPath();c.arc(0,0,.35,0,6.283);c.stroke();}
  c.restore();}
g.Organism={draw,algae,plan};
if(typeof module!=='undefined')module.exports=g.Organism;
})(typeof window!=='undefined'?window:globalThis);
