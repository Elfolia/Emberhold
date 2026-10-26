(()=>{
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
let W=0,H=0,dpr=1,scale=1,camX=0,camY=0,last=0,elapsed=0,notice=0,weather="sun",weatherTimer=45;
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hero={x:0,y:2,hp:100,wood:0,meat:0,money:0,dress:0,hit:0,invuln:0,dir:1};
const stock={wood:0,meat:0},moneyDrops=[],drops=[],particles=[],birds=[],trees=[],bears=[],customers=[];
const state={dress:false,seller:false,hunter:false,archers:0,carrier:false,progress:{seller:0,hunter:0,archerL:0,archerR:0,carrier:0},day:0,season:0};
const zones=[{id:"seller",x:3.7,y:2.8,cost:100,label:"Verkäufer",icon:"🏪"},{id:"hunter",x:-3.5,y:3.1,cost:160,label:"Holzfäller & Jäger",icon:"🪓"},{id:"archerL",x:-5.4,y:-2.5,cost:180,label:"Bogenschütze",icon:"🏹"},{id:"archerR",x:5.4,y:-2.5,cost:180,label:"Bogenschütze",icon:"🏹"},{id:"carrier",x:-3.7,y:-2.9,cost:240,label:"Träger",icon:"📦"}];
const seasonNames=["Frühling","Sommer","Herbst","Winter"];
const fort=(x,y)=>Math.abs(x)<6.1&&Math.abs(y)<5.5;
function say(t){$("toast").textContent=t;notice=4}
function save(){try{localStorage.setItem("emberhold-v1",JSON.stringify({hero:{money:hero.money,dress:hero.dress},stock,state,elapsed}))}catch(e){}}
function load(){try{let s=JSON.parse(localStorage.getItem("emberhold-v1"));if(!s)return false;hero.money=s.hero.money||0;hero.dress=s.hero.dress||0;Object.assign(stock,s.stock||{});Object.assign(state,s.state||{});state.progress=Object.assign({seller:0,hunter:0,archerL:0,archerR:0,carrier:0},state.progress);elapsed=s.elapsed||0;return true}catch(e){return false}}
function init(){for(let i=0;i<43;i++){let a=i*2.3999,r=8.3+(i%7)*2.5;trees.push({x:Math.cos(a)*r,y:Math.sin(a)*r,hp:4,respawn:0,shake:0})}for(let i=0;i<5;i++)spawnBear();for(let i=0;i<5;i++)customers.push({x:2+i*.85,y:7.3,wait:rand(0,3),phase:rand(0,7)});load();$("play").textContent="Spiel fortsetzen";say("Willkommen in Emberhold. Sammle Holz und Fleisch!")}
function spawnBear(){let a=rand(0,Math.PI*2),r=rand(9,16);bears.push({x:Math.cos(a)*r,y:Math.sin(a)*r,hp:7,cool:0,wobble:rand(0,6),facing:1,moving:false,attack:0,walkTime:rand(0,1),state:"idle"})}
function item(x,y,type,n=1){for(let i=0;i<n;i++)drops.push({x:x+rand(-.65,.65),y:y+rand(-.65,.65),type,age:0})}
function effect(x,y,color,n=5){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-2,2),vy:rand(-2,1),life:rand(.3,.8),color})}
function step(dt){
elapsed+=dt;state.day=elapsed/135;state.season=Math.floor(elapsed/540)%4;
weatherTimer-=dt;if(weatherTimer<0){weather=["sun","sun","wind","rain","mist"][Math.floor(rand(0,5))];weatherTimer=rand(30,70)}
const mv={x:stick.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),y:stick.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)},ml=Math.hypot(mv.x,mv.y);
if(ml>.1){hero.x+=mv.x/ml*3.4*dt;hero.y+=mv.y/ml*3.4*dt;hero.dir=mv.x<0?-1:1}
hero.x=clamp(hero.x,-28,28);hero.y=clamp(hero.y,-26,26);hero.hit-=dt;hero.invuln-=dt;
if(fort(hero.x,hero.y))hero.hp=Math.min(100,hero.hp+12*dt);
for(const t of trees){if(t.respawn>0){t.respawn-=dt;continue}t.shake=Math.max(0,t.shake-dt);if(distance(hero,t)<1.35&&hero.hit<=0){hero.hit=.58;t.hp--;t.shake=.23;effect(t.x,t.y,"#e4bb70",3);if(t.hp<=0){item(t.x,t.y,"wood",4);t.respawn=19;t.hp=4}}}
for(const b of bears){b.cool-=dt;b.attack=Math.max(0,(b.attack||0)-dt);b.moving=false;const d=distance(hero,b);if(d<4.2&&!fort(hero.x,hero.y)){const dx=(hero.x-b.x)/Math.max(d,.1),dy=(hero.y-b.y)/Math.max(d,.1);if(d>1.15){b.x+=dx*.7*dt;b.y+=dy*.7*dt;b.facing=dx<0?-1:1;b.moving=true;b.walkTime=(b.walkTime||0)+dt*5.8}}if(fort(b.x,b.y)){b.x*=1+dt*.3;b.y*=1+dt*.3}if(d<1.45&&!fort(hero.x,hero.y)&&b.cool<=0&&hero.invuln<=0){hero.hp-=13;b.cool=1.8;b.attack=.55;hero.invuln=.7;effect(hero.x,hero.y,"#c74435",6);say("Autsch! Zurück ins Fort zum Ausruhen.")}if(d<1.45&&hero.hit<=0){hero.hit=.65;b.hp-=2;effect(b.x,b.y,"#c69a69",4)}if(state.archers&&distance(b,{x:0,y:0})<11){b.hp-=state.archers*.55*dt}}
for(let i=bears.length-1;i>=0;i--)if(bears[i].hp<=0){let b=bears[i];item(b.x,b.y,"meat",5);bears.splice(i,1);effect(b.x,b.y,"#d9b77b",9)}
if(bears.length<5&&Math.random()<dt*.13)spawnBear();
if(hero.hp<=0){hero.x=0;hero.y=1;hero.hp=65;say("Du bist im Fort wieder aufgewacht. Deine Waren bleiben erhalten.")}
for(let i=drops.length-1;i>=0;i--){let d=drops[i];d.age+=dt;if(distance(hero,d)<.85){hero[d.type]++;effect(d.x,d.y,"#f3d58a",2);drops.splice(i,1)}}
if(state.hunter){let t=trees.find(t=>t.respawn<=0);if(t){t.auto=(t.auto||0)+dt;if(t.auto>5.5){t.auto=0;t.hp--;t.shake=.2;if(t.hp<=0){item(t.x,t.y,"wood",4);t.hp=4;t.respawn=19}}}let b=bears.find(b=>distance(b,{x:0,y:0})<17);if(b){b.hp-=dt*.22}}
if(state.carrier){for(let i=drops.length-1;i>=0;i--){let d=drops[i];if(d.age>3&&Math.random()<dt*.45&&stock[d.type]<1000){stock[d.type]++;drops.splice(i,1)}}}
if(distance(hero,{x:0,y:1})<2.5){for(const type of ["wood","meat"]){let n=Math.min(hero[type],1000-stock[type]);if(n>0){stock[type]+=n;hero[type]-=n}}}
const atCounter=distance(hero,{x:2.8,y:1})<1.65;
if(atCounter||state.seller){sellTimer+=dt;if(sellTimer>=1.4){sellTimer=0;let type=stock.wood>0?"wood":stock.meat>0?"meat":null;if(type){stock[type]--;moneyDrops.push({x:4.5+rand(-.25,.25),y:1+rand(-.25,.25),value:1});customers[0].phase+=1}}}else sellTimer=0;
for(let i=moneyDrops.length-1;i>=0;i--){if(distance(hero,moneyDrops[i])<1.05){hero.money+=moneyDrops[i].value;moneyDrops.splice(i,1)}}
if(!state.dress&&stock.wood>=30&&stock.meat>=30&&distance(hero,{x:2.8,y:1})<2.1){stock.wood-=30;stock.meat-=30;state.dress=true;hero.dress=1;say("✨ Ein Händler tauscht 30 Holz und 30 Fleisch gegen ein schönes Nachthemd!")}
for(const z of zones){if((z.id==="seller"&&state.seller)||(z.id==="hunter"&&state.hunter)||(z.id==="carrier"&&state.carrier)||(z.id==="archerL"&&state.progress.archerL>=z.cost)||(z.id==="archerR"&&state.progress.archerR>=z.cost))continue;
if(z.id==="hunter"&&!state.seller||z.id.startsWith("archer")&&!state.hunter||z.id==="carrier"&&state.archers<2)continue;
if(distance(hero,z)<1.05&&hero.money>0){let amount=Math.min(hero.money,z.cost-state.progress[z.id],Math.max(1,Math.ceil(dt*35)));state.progress[z.id]+=amount;hero.money-=amount;if(state.progress[z.id]>=z.cost){if(z.id==="seller")state.seller=true;if(z.id==="hunter")state.hunter=true;if(z.id.startsWith("archer"))state.archers++;if(z.id==="carrier")state.carrier=true;say("✨ "+z.label+" ist jetzt Teil von Emberhold!")}}}
for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
if(Math.random()<dt*.035)birds.push({x:-22,y:rand(-18,6),t:0});for(let i=birds.length-1;i>=0;i--){birds[i].x+=dt*5;birds[i].t+=dt;if(birds[i].x>23)birds.splice(i,1)}
notice-=dt;if(notice<0)$("toast").textContent="";
if(Math.floor(elapsed)%12===0&&!savedThisSecond){save();savedThisSecond=true}if(Math.floor(elapsed)%12!==0)savedThisSecond=false;
$("cash").textContent="💰 "+hero.money+" Scheine";$("inventory").textContent="🪵 "+hero.wood+" 🥩 "+hero.meat;$("health").textContent="❤️ "+Math.ceil(hero.hp);$("clock").textContent=["🌱","☀️","🍂","❄️"][state.season]+" "+seasonNames[state.season]+" · Tag "+(Math.floor(state.day)+1);
}
let sellTimer=0,savedThisSecond=false;
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=clamp(Math.min(W/16,H/21),22,48)}
function screen(x,y,z=0){return {x:W/2+(x-camX)*scale,y:H*.52+(y-camY)*scale*.67-z*scale}}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}
function text(s,x,y,size=13,color="#fff2d2"){ctx.fillStyle=color;ctx.font="bold "+size+"px Georgia";ctx.textAlign="center";ctx.shadowColor="#18241e";ctx.shadowBlur=4;ctx.fillText(s,x,y);ctx.shadowBlur=0}
function log(x,y,h=1.8){let p=screen(x,y);ellipse(p.x,p.y+3,scale*.22,scale*.1,"#17251a55");rect(p.x-scale*.19,p.y-h*scale*.66,scale*.38,h*scale*.66,"#715139");poly([[p.x-scale*.19,p.y-h*scale*.66],[p.x,p.y-h*scale*.82],[p.x+scale*.19,p.y-h*scale*.66]],"#a07a53");rect(p.x-scale*.08,p.y-h*scale*.65,scale*.07,h*scale*.55,"#aa825a")}
const treeArt=new Image();treeArt.src="./assets/enchanted-tree.webp";let treeArtReady=false;treeArt.onload=()=>treeArtReady=true;
function tree(t){if(t.respawn>0)return;let p=screen(t.x,t.y),s=scale;
if(treeArtReady){let h=s*4.25,w=h*treeArt.naturalWidth/treeArt.naturalHeight;ctx.save();if(t.shake)ctx.translate(Math.sin(elapsed*40)*s*.045,0);ctx.drawImage(treeArt,p.x-w*.5,p.y-h*.95,w,h);ctx.restore();return}
ellipse(p.x,p.y+3,s*.55,s*.18,"#253b2877");rect(p.x-s*.13,p.y-s*1.4,s*.26,s*1.4,"#70513a");for(let i=0;i<3;i++){let off=t.shake?Math.sin(elapsed*40)*s*.08:0;ellipse(p.x+off+(i-1)*s*.3,p.y-s*(1.5+i*.3),s*(.72-i*.09),s*(.62-i*.06),["#456a47","#5e8051","#73915b"][i])}}
function human(x,y,dress=0,small=false){let p=screen(x,y),s=scale*(small?.8:1);ellipse(p.x,p.y,s*.26,s*.1,"#18261d77");poly([[p.x-s*.18,p.y-s*.82],[p.x+s*.18,p.y-s*.82],[p.x+s*.32,p.y-s*.16],[p.x-s*.3,p.y-s*.16]],dress?"#d7bfa2":"#a8957d");rect(p.x-s*.12,p.y-s*.18,s*.09,s*.21,"#6e5546");rect(p.x+s*.07,p.y-s*.18,s*.09,s*.21,"#6e5546");ellipse(p.x,p.y-s*1.03,s*.2,s*.26,"#e1b48a");ellipse(p.x-s*.045,p.y-s*1.18,s*.24,s*.19,"#8b6a3e");rect(p.x-s*.22,p.y-s*.85,s*.09,s*.42,"#e1b48a");rect(p.x+s*.13,p.y-s*.85,s*.09,s*.42,"#e1b48a");if(!small)text("🪓",p.x+s*.29,p.y-s*.48,Math.max(11,s*.36))}
// Hand-painted sprite atlas: 6 walk frames in row 0; 4 attack frames in row 1.
// Every frame is 220x170; the ground line is y=140 (walk) / y=161 (attack).
const bearWalkSheet=new Image();bearWalkSheet.src="./assets/bear-animations.png";
let bearWalkReady=false;bearWalkSheet.onload=()=>{bearWalkReady=bearWalkSheet.naturalWidth===1320&&bearWalkSheet.naturalHeight===340};
const bearArt=new Image();bearArt.src="./assets/enchanted-bear.png";let bearArtReady=false;bearArt.onload=()=>bearArtReady=true;
function bear(b){let p=screen(b.x,b.y),s=scale;
ctx.save();ctx.translate(p.x,p.y);ctx.scale(b.facing||1,1);
ellipse(0,2,s*.58,s*.17,"#17251a55");
if(bearWalkReady){
 const attacking=b.attack>0;
 const frame=attacking?Math.min(3,Math.floor((.55-b.attack)/.55*4)):b.moving?Math.floor((b.walkTime||0))%6:0;
 const sourceX=frame*220,sourceY=attacking?170:0,groundY=attacking?161:140;
 const w=s*2.15,h=w*170/220;
 // Fixed foot anchor: sprite frames advance but feet never float off the terrain.
 ctx.drawImage(bearWalkSheet,sourceX,sourceY,220,170,-w/2,-groundY*h/170,w,h);
 ctx.restore();return;
}
if(bearArtReady){let h=s*1.95,w=h*bearArt.naturalWidth/bearArt.naturalHeight;ctx.drawImage(bearArt,-w*.5,-h,w,h);ctx.restore();return}
ctx.restore();
ellipse(p.x,p.y-s*.55,s*.59,s*.52,"#70503c");ellipse(p.x,p.y-s*.95,s*.43,s*.37,"#815b42");ellipse(p.x-s*.29,p.y-s*1.24,s*.16,s*.17,"#76513a");ellipse(p.x+s*.29,p.y-s*1.24,s*.16,s*.17,"#76513a");ellipse(p.x,p.y-s*.81,s*.21,s*.16,"#ac8869");ellipse(p.x,p.y-s*.88,s*.07,s*.05,"#392b27")}

function render(){
camX+=(hero.x-camX)*.07;camY+=(hero.y-camY)*.07;let dayPhase=(state.day%1),night=Math.max(0,Math.sin(dayPhase*Math.PI*2-Math.PI/2)*-.5+.1);
let bg=state.season===3?"#b5b9b1":state.season===2?"#82916a":"#789a74";ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
let startX=Math.floor(camX-18),endX=Math.ceil(camX+18),startY=Math.floor(camY-25),endY=Math.ceil(camY+25);
for(let x=startX;x<endX;x+=2)for(let y=startY;y<endY;y+=2){let p=screen(x,y);let v=Math.abs(Math.sin(x*12.4+y*9.1));ellipse(p.x,p.y,scale*.12,scale*.045,v>.6?"#b6ad7a33":"#314d3430")}
let a=screen(-6.5,-5.9),b=screen(6.5,6.2);rect(a.x,a.y,b.x-a.x,b.y-a.y,"#a58b6355");
for(let y=-4;y<6;y+=1.4)for(let x=-5;x<6;x+=1.5){let p=screen(x,y);ellipse(p.x,p.y,scale*.2,scale*.08,"#8b775339")}
for(let x=-6;x<=6;x+=.65){if(Math.abs(x)>1.2)log(x,5.5,1.9);log(x,-5.5,1.9)}
for(let y=-4.9;y<=5;y+=.65){log(-6.1,y,1.9);log(6.1,y,1.9)}
let p=screen(2.8,1);rect(p.x-scale*1.3,p.y-scale*.6,scale*2.6,scale*.85,"#664735");rect(p.x-scale*1.4,p.y-scale*.69,scale*2.8,scale*.2,"#b08a57");rect(p.x-scale*1.25,p.y-scale*1.5,scale*.15,scale*.8,"#765239");rect(p.x+scale*1.1,p.y-scale*1.5,scale*.15,scale*.8,"#765239");poly([[p.x-scale*1.45,p.y-scale*1.5],[p.x,p.y-scale*2.08],[p.x+scale*1.45,p.y-scale*1.5]],"#805944");text("TRESEN",p.x,p.y-scale*1.54,Math.max(9,scale*.24));
for(let i=0;i<Math.min(stock.wood,25);i++){let q=screen(1.9+(i%5)*.32,.6+Math.floor(i/5)*.16,.52);rect(q.x-5,q.y-4,11,6,"#c19a65");rect(q.x-5,q.y-4,3,6,"#8c613b")}
for(let i=0;i<Math.min(stock.meat,20);i++){let q=screen(3+(i%5)*.25,.65+Math.floor(i/5)*.14,.5);ellipse(q.x,q.y,scale*.11,scale*.055,"#a4534b")}
text("🪵"+stock.wood+"  🥩"+stock.meat,p.x,p.y+scale*.53,12);
let cashP=screen(4.5,1);ellipse(cashP.x,cashP.y,scale*.55,scale*.22,"#d9b35a77");text("💰",cashP.x,cashP.y,20);
for(const z of zones){if(z.id==="hunter"&&!state.seller||z.id.startsWith("archer")&&!state.hunter||z.id==="carrier"&&state.archers<2)continue;let q=screen(z.x,z.y),done=state.progress[z.id]>=z.cost||(z.id==="seller"&&state.seller)||(z.id==="hunter"&&state.hunter)||(z.id==="carrier"&&state.carrier);ellipse(q.x,q.y,scale*.8,scale*.3,done?"#638c6977":"#d2b36b99");text(done?"✓":z.icon,q.x,q.y,Math.max(14,scale*.44));if(!done)text(z.label+" "+state.progress[z.id]+"/"+z.cost,q.x,q.y+scale*.5,11)}
let actors=[...trees.filter(t=>t.respawn<=0).map(t=>({y:t.y,draw:()=>tree(t)})),...bears.map(b=>({y:b.y,draw:()=>bear(b)})),{y:hero.y,draw:()=>human(hero.x,hero.y,hero.dress)}];if(state.seller)actors.push({y:1.1,draw:()=>human(2.8,1.1,1,true)});if(state.hunter)actors.push({y:-6.9,draw:()=>human(-4.4,-6.9,1,true)});for(let i=0;i<state.archers;i++)actors.push({y:-5.5,draw:()=>human(i?-5.4:5.4,-5.5,1,true)});if(state.carrier)actors.push({y:-2.9,draw:()=>human(-3.7,-2.9,1,true)});actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
for(let i=0;i<customers.length;i++){let c=customers[i];human(2+i*.78,7.2,0,true)}
for(const d of drops){let p=screen(d.x,d.y);text(d.type==="wood"?"🪵":"🥩",p.x,p.y,Math.max(14,scale*.42))}
for(const d of moneyDrops){let p=screen(d.x,d.y);text("💵",p.x,p.y,Math.max(12,scale*.34))}
for(const e of particles){let p=screen(e.x,e.y);ellipse(p.x,p.y,3,3,e.color)}
for(const bird of birds){let p=screen(bird.x,bird.y,4);text("⌣",p.x,p.y+Math.sin(bird.t*9)*4,20,"#283a36")}
if(weather==="rain"){ctx.strokeStyle="#c7d8da88";ctx.lineWidth=1;for(let i=0;i<75;i++){let x=(i*73+elapsed*90)%W,y=(i*109+elapsed*180)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+14);ctx.stroke()}}
if(weather==="wind"||state.season===2){for(let i=0;i<15;i++){let x=(i*97+elapsed*35)%W,y=(i*51+Math.sin(elapsed+i)*18)%H;ellipse(x,y,5,2,state.season===2?"#bd8e51aa":"#d9e1b277")}}
if(state.season===3){for(let i=0;i<45;i++){let x=(i*89+elapsed*15)%W,y=(i*131+elapsed*24)%H;ellipse(x,y,2.5,2.5,"#fffdf1c9")}}
if(weather==="mist"){rect(0,0,W,H,"#d5dfd144")}
rect(0,0,W,H,"rgba(15,26,44,"+(night*.63)+")");
if(night>.2){let q=screen(2.8,1);let glow=ctx.createRadialGradient(q.x,q.y,1,q.x,q.y,scale*5);glow.addColorStop(0,"#f8bc6180");glow.addColorStop(1,"#f8bc6100");ctx.fillStyle=glow;ctx.fillRect(q.x-scale*5,q.y-scale*5,scale*10,scale*10)}
if(!state.dress&&stock.wood<30||!state.dress&&stock.meat<30){let q=screen(2.8,1);text("✨ Nachthemd: 30 Holz + 30 Fleisch",q.x,q.y-scale*2.4,12)}
}
const stick={x:0,y:0},keys={};$("stick").addEventListener("pointerdown",e=>{e.currentTarget.setPointerCapture(e.pointerId);joy(e)});$("stick").addEventListener("pointermove",e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))joy(e)});function joy(e){let b=$("stick").getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2,l=Math.max(1,Math.hypot(x,y));stick.x=x/l*Math.min(1,l/48);stick.y=y/l*Math.min(1,l/48);$("knob").style.transform="translate("+(stick.x*35)+"px,"+(stick.y*35)+"px)"}function stop(){stick.x=stick.y=0;$("knob").style.transform=""}$("stick").addEventListener("pointerup",stop);$("stick").addEventListener("pointercancel",stop);addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true});addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
let audio=null,muted=true;$("sound").onclick=()=>{muted=!muted;$("sound").textContent=muted?"🔇 Ton":"🔊 Ton";if(!muted){audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume()}};function ambience(){if(muted||!audio)return;let o=audio.createOscillator(),g=audio.createGain();o.type="sine";o.frequency.value=[196,220,261,293,329][Math.floor(rand(0,5))];g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.015,audio.currentTime+.15);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+1.5);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+1.6)}setInterval(ambience,2400);
function frame(t){let dt=Math.min(.045,(t-last)/1000||.016);last=t;step(dt);render();requestAnimationFrame(frame)}
$("play").onclick=()=>{$("start").style.display="none";last=performance.now();requestAnimationFrame(frame)};addEventListener("resize",resize);addEventListener("pagehide",save);resize();init();render();
})();