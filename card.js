// Specimen card, 1200x630. Shared by browser (download/preview) and server (og:image).
(function(g){
'use strict';
function card(c,d,Org,fonts){
  const SERIF=fonts&&fonts.serif||'Georgia, serif',MONO=fonts&&fonts.mono||'monospace';
  const W=1200,H=630,INK='#111314',INK2='#5b554a',RULE='#cbbfa6',RUST='#c9531a';
  c.fillStyle='#f3eddb';c.fillRect(0,0,W,H);
  c.strokeStyle=INK;c.lineWidth=1.5;c.strokeRect(28,28,W-56,H-56);c.lineWidth=.6;c.strokeRect(36,36,W-72,H-72);
  c.fillStyle=INK;c.font=`italic 34px ${SERIF}`;c.textBaseline='alphabetic';c.fillText('Primordial',64,94);
  c.font=`13px ${MONO}`;c.fillStyle=INK2;c.fillText((d.kicker||'SPECIMEN').toUpperCase(),64,122);
  c.textAlign='right';c.fillText('PLATE '+(d.plate||'I')+'   EPOCH '+d.tick,W-64,94);c.textAlign='left';
  c.strokeStyle=INK;c.lineWidth=.8;c.beginPath();c.moveTo(64,140);c.lineTo(W-64,140);c.stroke();
  // specimen in a roundel
  const cx=270,cy=360,R=170;c.strokeStyle=INK;c.lineWidth=.8;c.beginPath();c.arc(cx,cy,R,0,6.283);c.stroke();
  c.lineWidth=.4;c.beginPath();c.arc(cx,cy,R+7,0,6.283);c.stroke();
  for(let i=0;i<120;i++){const a=i/120*6.283,l=i%10===0?8:4;c.beginPath();c.moveTo(cx+Math.cos(a)*(R+7),cy+Math.sin(a)*(R+7));c.lineTo(cx+Math.cos(a)*(R+7+l),cy+Math.sin(a)*(R+7+l));c.stroke();}
  if(d.sp&&Org){const k={x:cx,y:cy,dx:1,dy:-.18,id:d.sp.id,v:.8};const l=Math.sqrt(1+.18*.18);k.dx/=l;k.dy/=l;Org.draw(c,k,d.sp,d.root||d.sp,58,1,d.tick||0,2);}
  c.fillStyle=INK2;c.font=`italic 14px ${SERIF}`;c.textAlign='center';c.fillText('Fig. '+(d.sp?d.sp.id:'') + '. Drawn from the living tank.',cx,cy+R+40);c.textAlign='left';
  // text column
  const x0=520;c.fillStyle=INK;c.font=`italic 52px ${SERIF}`;c.fillText(d.title||'',x0,222);
  c.font=`19px ${SERIF}`;c.fillStyle=INK2;wrap(c,d.subtitle||'',x0,262,600,28);
  const rows=d.stats||[];c.font=`12px ${MONO}`;
  rows.forEach((r,i)=>{const col=i%3,row=(i/3)|0,x=x0+col*205,y=356+row*62;c.fillStyle=INK2;c.fillText(String(r[0]).toUpperCase(),x,y);
    c.fillStyle=INK;c.font=`24px ${MONO}`;c.fillText(String(r[1]),x,y+30);c.font=`12px ${MONO}`;
    c.strokeStyle=RULE;c.lineWidth=.6;c.beginPath();c.moveTo(x-10,y-14);c.lineTo(x-10,y+36);c.stroke();});
  if(d.traits&&d.traits.length){c.fillStyle=RUST;c.font=`12px ${MONO}`;c.fillText('TRAITS  '+d.traits.join('  /  ').toUpperCase(),x0,500);}
  c.strokeStyle=INK;c.lineWidth=.8;c.beginPath();c.moveTo(x0,530);c.lineTo(W-64,530);c.stroke();
  c.fillStyle=INK2;c.font=`13px ${MONO}`;c.fillText((d.footer||'A shared tank of evolving life.').toUpperCase(),x0,558);
  c.textAlign='right';c.fillText((d.domain||'primordialsoup.fun').toUpperCase(),W-64,558);c.textAlign='left';
}
function wrap(c,t,x,y,w,lh){const words=t.split(' ');let line='';for(const wd of words){const tt=line?line+' '+wd:wd;if(c.measureText(tt).width>w&&line){c.fillText(line,x,y);y+=lh;line=wd;}else line=tt;}if(line)c.fillText(line,x,y);}
g.Card={card};
if(typeof module!=='undefined')module.exports=g.Card;
})(typeof window!=='undefined'?window:globalThis);
