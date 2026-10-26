"use strict";
// Emberhold — persistent, expansive, hand-painted forest floor. No other game objects.
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=0,H=0,dpr=1,zoom=1,camX=0,camY=0;
const TILE=384,cache=new Map(),MAX_TILES=80;
function hash(x,y,seed=0){let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
function noise(x,y,seed=0){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v}
function fbm(x,y,seed=0){return noise(x,y,seed)*.55+noise(x*2.07,y*2.07,seed+11)*.29+noise(x*4.11,y*4.11,seed+23)*.16}
function randMaker(x,y){let a=((x*73856093)^(y*19349663)^0x5f3759df)>>>0;return ()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return (a>>>0)/4294967296}}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function makeTile(tx,ty){
 const c=document.createElement("canvas");c.width=c.height=TILE;const g=c.getContext("2d"),im=g.createImageData(TILE,TILE),p=im.data;
 // All color is a deterministic function of absolute world coordinates. Adjacent tiles meet perfectly.
 for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
  const wx=tx*TILE+x,wy=ty*TILE+y;
  const biome=fbm(wx/1450,wy/1450,4),patch=fbm(wx/310,wy/310,9),fine=fbm(wx/48,wy/48,17);
  const trail=Math.abs(fbm(wx/620,wy/620,32)-.5);
  const soil=Math.max(0,Math.min(1,(.45-patch)*2.8+(trail<.047?.30:0)));
  const light=Math.max(0,Math.min(1,(biome-.36)*1.8));
  const grit=(hash(wx,wy,77)-.5)*17+(fine-.5)*23;
  const grass=[43+light*66,75+light*70,40+light*29];
  const earth=[112+light*51,80+light*43,52+light*26];
  const mix=soil*.87;const i=(y*TILE+x)*4;
  p[i]=Math.max(0,Math.min(255,grass[0]*(1-mix)+earth[0]*mix+grit));
  p[i+1]=Math.max(0,Math.min(255,grass[1]*(1-mix)+earth[1]*mix+grit));
  p[i+2]=Math.max(0,Math.min(255,grass[2]*(1-mix)+earth[2]*mix+grit*.75));p[i+3]=255;
 }
 g.putImageData(im,0,0);
 const rng=randMaker(tx,ty);
 // Natural ground details. Nothing animated, nothing tied to frame time or camera.
 for(let i=0;i<920;i++){
  const x=rng()*TILE,y=rng()*TILE,wx=tx*TILE+x,wy=ty*TILE+y;
  const dirt=fbm(wx/310,wy/310,9)<.42,kind=rng();
  if(kind<.55&&!dirt){
   g.strokeStyle=rng()>.5?"#b0bb77a0":"#203d2e8a";g.lineWidth=.7+rng()*1.5;
   g.beginPath();g.moveTo(x,y);g.lineTo(x+(rng()-.5)*6,y-3-rng()*7);g.stroke();
  }else if(kind<.76){
   oval(g,x,y,1+rng()*4,.6+rng()*2,dirt?"#5e493c77":"#b0b56b66");
  }else if(kind<.87){
   oval(g,x,y,1.5+rng()*4,1+rng()*2,"#6c73668a");
   oval(g,x-1,y-1,1.1+rng()*2,.7+rng(),"#b1ad9388");
  }else if(kind<.94&&!dirt){
   const col=["#f2e6bb","#e7c874","#e6b7a1","#faf4dd"][Math.floor(rng()*4)];
   for(let a=0;a<5;a++){const ang=a*Math.PI*2/5;oval(g,x+Math.cos(ang)*2.5,y+Math.sin(ang)*2.5,1.6,1.1,col)}
   oval(g,x,y,1.3,1.3,"#d5a54d");
  }else if(!dirt){
   oval(g,x,y,4+rng()*9,2+rng()*5,"#234a2a33");
   for(let j=0;j<5;j++)oval(g,x+(rng()-.5)*13,y+(rng()-.5)*8,1+rng()*3,1+rng()*2,"#9aaf5b77");
  }
 }
 // Blend deterministic cropped fragments of the illustrated forest artwork.
 // Neighboring tiles use the same global fragment grid, so edges remain continuous.
 if(paintedGroundReady){
  const spacing=92,patchSize=150;
  const gx0=Math.floor((tx*TILE-patchSize)/spacing),gx1=Math.ceil(((tx+1)*TILE+patchSize)/spacing);
  const gy0=Math.floor((ty*TILE-patchSize)/spacing),gy1=Math.ceil(((ty+1)*TILE+patchSize)/spacing);
  for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
   const h=hash(gx,gy,90),j=hash(gx,gy,91),k=hash(gx,gy,92);
   const wx=gx*spacing+(j-.5)*44,wy=gy*spacing+(k-.5)*44;
   const x=wx-tx*TILE,y=wy-ty*TILE;
   const sourceW=paintedGround.naturalWidth,sourceH=paintedGround.naturalHeight;
   const crop=Math.min(sourceW,sourceH)*.17;
   const sx=(hash(gx,gy,93)*(sourceW-crop)),sy=(hash(gx,gy,94)*(sourceH-crop));
   const size=patchSize*(.82+h*.36);
   const stamp=document.createElement("canvas");stamp.width=stamp.height=256;
   const sg=stamp.getContext("2d");sg.drawImage(paintedGround,sx,sy,crop,crop,0,0,256,256);
   sg.globalCompositeOperation="destination-in";
   const mask=sg.createRadialGradient(128,128,48,128,128,164);
   mask.addColorStop(0,"rgba(0,0,0,1)");mask.addColorStop(.70,"rgba(0,0,0,.95)");mask.addColorStop(1,"rgba(0,0,0,0)");
   sg.fillStyle=mask;sg.fillRect(0,0,256,256);
   g.save();g.translate(x,y);g.rotate((hash(gx,gy,95)-.5)*Math.PI*.7);
   g.drawImage(stamp,-size/2,-size/2,size,size);g.restore();
  }
 }
 return c;
}
function tile(tx,ty){const key=tx+","+ty;if(cache.has(key)){const c=cache.get(key);cache.delete(key);cache.set(key,c);return c}const c=makeTile(tx,ty);cache.set(key,c);if(cache.size>MAX_TILES)cache.delete(cache.keys().next().value);return c}
// The approved illustrated forest-floor artwork is the actual terrain texture.
// Keep it locked to world coordinates; never randomize or repaint it per frame.
const paintedGround=new Image();let paintedGroundReady=false;
paintedGround.onload=()=>{paintedGroundReady=true;cache.clear();render()};
paintedGround.onerror=()=>{paintedGroundReady=false;render()};
paintedGround.src="./assets/emberhold-waldboden.webp?v=1";
function render(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#527c4c";ctx.fillRect(0,0,W,H);
 const ox=Math.round(W/2-camX*zoom),oy=Math.round(H/2-camY*zoom);
 // Deterministic generated ground, enriched with painted fragments when the asset exists.
 const x0=Math.floor((-ox/zoom)/TILE),x1=Math.floor(((W-ox)/zoom)/TILE);
 const y0=Math.floor((-oy/zoom)/TILE),y1=Math.floor(((H-oy)/zoom)/TILE);
 for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
  const dx=Math.round(ox+tx*TILE*zoom),dy=Math.round(oy+ty*TILE*zoom);
  const dx2=Math.round(ox+(tx+1)*TILE*zoom),dy2=Math.round(oy+(ty+1)*TILE*zoom);
  ctx.drawImage(tile(tx,ty),dx,dy,dx2-dx+1,dy2-dy+1);
 }
}
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);render()}
window.addEventListener("resize",resize);
let pointer=null;
canvas.addEventListener("pointerdown",e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(!pointer||pointer.id!==e.pointerId)return;camX-=(e.clientX-pointer.x)/zoom;camY-=(e.clientY-pointer.y)/zoom;pointer.x=e.clientX;pointer.y=e.clientY;render()});
canvas.addEventListener("pointerup",()=>pointer=null);
canvas.addEventListener("pointercancel",()=>pointer=null);
canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.max(.7,Math.min(1.7,zoom*(e.deltaY>0?.9:1.1)));render()},{passive:false});
const keys={};window.addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true});window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;const speed=330*dt/zoom;let moved=false;if(keys.arrowleft||keys.a){camX-=speed;moved=true}if(keys.arrowright||keys.d){camX+=speed;moved=true}if(keys.arrowup||keys.w){camY-=speed;moved=true}if(keys.arrowdown||keys.s){camY+=speed;moved=true}if(moved)render();requestAnimationFrame(loop)}
resize();requestAnimationFrame(loop);
