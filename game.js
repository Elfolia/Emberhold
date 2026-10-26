"use strict";
// EMBERHOLD: deterministic infinite forest. No image collage, no repeated picture tiles.
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d",{alpha:false});
const TILE=256,MAX_CACHE=64,cache=new Map();
let W=0,H=0,dpr=1,zoom=1,camX=0,camY=0,drag=null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,s=0){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s+1,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296}
function noise(x,y,s=0){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return mix(mix(hash(ix,iy,s),hash(ix+1,iy,s),u),mix(hash(ix,iy+1,s),hash(ix+1,iy+1,s),u),v)}
function fractal(x,y,s=0){return noise(x,y,s)*.54+noise(x*2.03,y*2.03,s+17)*.29+noise(x*4.09,y*4.09,s+37)*.17}
function rngAt(x,y,s=0){let v=(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(s+1,83492791))>>>0;return ()=>{v^=v<<13;v^=v>>>17;v^=v<<5;return (v>>>0)/4294967296}}
function ellipse(g,x,y,rx,ry,c,rot=0){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,rot,0,Math.PI*2);g.fill()}
function stroke(g,c,w){g.strokeStyle=c;g.lineWidth=w;g.lineCap="round";g.lineJoin="round"}
function landscape(x,y){
 const warp=(fractal(x/1700,y/1700,41)-.5)*300;
 const moisture=fractal((x+warp)/1250,(y-warp)/1250,2);
 const light=fractal(x/1900,y/1900,6);
 const clearing=fractal((x+warp)/570,(y+warp)/570,11);
 const trail=fractal((x+warp)/360,(y-warp)/360,29);
 const ground=fractal(x/190,y/190,14);
 const damp=clamp((moisture-.43)*2.8);
 const open=clamp((light-.38)*2.3+(clearing-.5)*1.4);
 const soil=clamp((.47-ground)*3.8+(trail<.38?.13:0));
 const mud=clamp((damp-.45)*1.9)*soil;
 const moss=clamp((damp-.34)*1.8)*(1-soil*.65);
 return {damp,open,soil,mud,moss,light,ground};
}
function groundColor(f,wx,wy){
 const m=f.moss,s=f.soil,wet=f.mud,lit=f.open;
 let r=mix(56+lit*54,35+lit*30,m*.75),g=mix(85+lit*50,75+lit*44,m*.75),b=mix(42+lit*20,35+lit*17,m*.75);
 r=mix(r,134+lit*26,s*.91);g=mix(g,98+lit*22,s*.91);b=mix(b,58+lit*15,s*.91);
 r=mix(r,69,wet*.74);g=mix(g,62,wet*.74);b=mix(b,43,wet*.74);
 const fine=(hash(wx,wy,90)-.5)*17+(noise(wx/15,wy/15,87)-.5)*22;
 const shade=(noise(wx/78,wy/78,88)-.5)*18;
 return [clamp(r+fine+shade,0,255),clamp(g+fine+shade,0,255),clamp(b+fine*.8+shade,0,255)];
}
function grass(g,x,y,rand,size=1){
 const n=5+Math.floor(rand()*6);
 ellipse(g,x,y+2,10*size,3*size,"#20392344");
 for(let i=0;i<n;i++){
  const bx=x+(rand()-.5)*12*size,by=y+(rand()-.5)*4*size;
  const h=(8+rand()*15)*size,lean=(rand()-.5)*12*size;
  stroke(g,rand()<.48?"#c5ce82":"#315a32",(.8+rand()*.8)*size);
  g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+lean*.45,by-h*.68,bx+lean,by-h);g.stroke();
  if(rand()<.27){stroke(g,"#789e4a",.8*size);g.beginPath();g.moveTo(bx,by-3*size);g.lineTo(bx-3*size,by-7*size);g.stroke()}
 }
}
function flower(g,x,y,rand,size=1){
 const h=(9+rand()*10)*size;
 ellipse(g,x+2*size,y+2*size,5*size,2*size,"#20392350");
 stroke(g,"#355e37",1.5*size);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-3*size,y-h*.5,x+2*size,y-h);g.stroke();
 ellipse(g,x-2*size,y-h*.48,4*size,1.6*size,"#679b4d",-.5);
 const col=["#fff4d9","#f3cf81","#e9b2a1","#d9d0f0"][Math.floor(rand()*4)],cx=x+2*size,cy=y-h;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(g,cx+Math.cos(a)*3*size,cy+Math.sin(a)*3*size,3.1*size,2.2*size,col,a)}
 ellipse(g,cx,cy,2*size,2*size,"#c5963b");
}
function rock(g,x,y,rand,size=1){
 const rx=(7+rand()*11)*size,ry=rx*(.47+rand()*.2);
 ellipse(g,x+2*size,y+3*size,rx*1.25,ry*.9,"#1e302558");
 g.fillStyle="#68745f";g.beginPath();g.moveTo(x-rx,y+ry*.2);g.lineTo(x-rx*.75,y-ry*.75);g.lineTo(x-rx*.18,y-ry*1.15);g.lineTo(x+rx*.7,y-ry*.85);g.lineTo(x+rx,y+ry*.1);g.lineTo(x+rx*.35,y+ry*.65);g.closePath();g.fill();
 g.fillStyle="#b1b39a";g.beginPath();g.moveTo(x-rx*.75,y-ry*.75);g.lineTo(x-rx*.18,y-ry*1.15);g.lineTo(x+rx*.7,y-ry*.85);g.lineTo(x+rx*.15,y-ry*.18);g.closePath();g.fill();
 stroke(g,"#435c45",1.1*size);g.beginPath();g.moveTo(x-rx*.4,y);g.lineTo(x+rx*.3,y+ry*.35);g.stroke();
}
function fern(g,x,y,rand,size=1){
 const h=(18+rand()*19)*size,lean=(rand()-.5)*16*size;
 ellipse(g,x,y+1,13*size,4*size,"#193d294a");
 stroke(g,"#294e2d",1.6*size);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+lean*.5,y-h*.5,x+lean,y-h);g.stroke();
 for(let i=1;i<8;i++){
  const t=i/9,px=x+lean*t,py=y-h*t,leaf=(8-4*t)*size;
  for(const side of [-1,1])ellipse(g,px+side*leaf*.5,py-2*size,leaf*.68,2.8*size,rand()<.5?"#6b9a52":"#9bb66a",side*.4);
 }
}
function leaf(g,x,y,rand,size=1){
 const a=rand()*Math.PI*2;g.save();g.translate(x,y);g.rotate(a);
 ellipse(g,1,2,6*size,3*size,"#182e1c40");
 ellipse(g,0,0,5*size,2.6*size,rand()<.5?"#a17c4d":"#bd9b61",.15);
 stroke(g,"#695536",.7*size);g.beginPath();g.moveTo(-5*size,0);g.lineTo(6*size,0);g.stroke();g.restore();
}
function moss(g,x,y,rand,size=1){
 ellipse(g,x,y+3*size,18*size,7*size,"#1e3e294f");
 for(let j=0;j<9;j++){const dx=(rand()-.5)*25*size,dy=(rand()-.5)*11*size;
  ellipse(g,x+dx,y+dy,3.5*size+rand()*3*size,2*size+rand()*2*size,rand()<.5?"#628c47":"#a1b86d")}
}
function mud(g,x,y,rand,size=1){
 ellipse(g,x,y,14*size,6*size,"#493e2d82",rand()*.5);
 ellipse(g,x-3*size,y-2*size,6*size,1.3*size,"#b7a17780",-.2);
}
function paintDetails(g,tx,ty){
 // Every feature belongs to a global cell, not to the rendering tile.
 // Include a border so features remain intact across tile edges.
 const CELL=42,MARGIN=65;
 const x0=Math.floor((tx*TILE-MARGIN)/CELL),x1=Math.ceil(((tx+1)*TILE+MARGIN)/CELL);
 const y0=Math.floor((ty*TILE-MARGIN)/CELL),y1=Math.ceil(((ty+1)*TILE+MARGIN)/CELL);
 for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){
  const rand=rngAt(gx,gy,17),wx=gx*CELL+rand()*CELL,wy=gy*CELL+rand()*CELL;
  const x=wx-tx*TILE,y=wy-ty*TILE,f=landscape(wx,wy),v=rand();
  const size=.75+rand()*.75;
  if(f.mud>.4&&v<.55)mud(g,x,y,rand,size);
  else if(f.soil>.68&&v<.4)leaf(g,x,y,rand,size);
  else if(v<.07+(1-f.open)*.05)rock(g,x,y,rand,size);
  else if(f.moss>.46&&v<.36)moss(g,x,y,rand,size);
  else if(f.damp>.47&&v<.35)fern(g,x,y,rand,size);
  else if(f.open>.5&&f.soil<.32&&v<.15)flower(g,x,y,rand,size);
  else if(f.soil<.65&&v<.82)grass(g,x,y,rand,size);
  else if(v<.65)leaf(g,x,y,rand,size*.75);
 }
 // Small sharp secondary details, seeded by absolute world cells.
 const S=12;
 const sx0=Math.floor(tx*TILE/S),sx1=Math.ceil((tx+1)*TILE/S);
 const sy0=Math.floor(ty*TILE/S),sy1=Math.ceil((ty+1)*TILE/S);
 for(let gy=sy0;gy<sy1;gy++)for(let gx=sx0;gx<sx1;gx++){
  const r=rngAt(gx,gy,61),wx=(gx+r())*S,wy=(gy+r())*S;
  const f=landscape(wx,wy),x=wx-tx*TILE,y=wy-ty*TILE;
  if(f.soil>.65){if(r()<.32)ellipse(g,x,y,1+r()*2,.6+r(),"#cfb47788")}
  else if(r()<.34){stroke(g,r()<.5?"#b9c778aa":"#2b5c32b0",.7);g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*4,y-3-r()*5);g.stroke()}
 }
}
function makeTile(tx,ty){
 const c=document.createElement("canvas");c.width=c.height=TILE;const g=c.getContext("2d");
 const image=g.createImageData(TILE,TILE),p=image.data;
 // Sample slowly varying biome fields on an 8px grid, then interpolate.
 // This avoids costly multi-octave noise for every single pixel.
 const STEP=8,N=TILE/STEP,fields=[];
 for(let y=0;y<=N;y++){const row=[];for(let x=0;x<=N;x++)row.push(landscape(tx*TILE+x*STEP,ty*TILE+y*STEP));fields.push(row)}
 for(let y=0;y<TILE;y++){
  const iy=y>>3,fy=(y%STEP)/STEP;
  for(let x=0;x<TILE;x++){
   const ix=x>>3,fx=(x%STEP)/STEP,a=fields[iy][ix],b=fields[iy][ix+1],c0=fields[iy+1][ix],d=fields[iy+1][ix+1],f={};
   for(const k of ["moss","soil","mud","open"])f[k]=mix(mix(a[k],b[k],fx),mix(c0[k],d[k],fx),fy);
   const wx=tx*TILE+x,wy=ty*TILE+y,color=groundColor(f,wx,wy),i=(y*TILE+x)*4;
   p[i]=color[0];p[i+1]=color[1];p[i+2]=color[2];p[i+3]=255;
  }
 }
 g.putImageData(image,0,0);paintDetails(g,tx,ty);return c;
}
function getTile(x,y){const key=x+","+y;if(cache.has(key)){const t=cache.get(key);cache.delete(key);cache.set(key,t);return t}const t=makeTile(x,y);cache.set(key,t);if(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);return t}
function render(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#42693b";ctx.fillRect(0,0,W,H);
 const ox=Math.round(W/2-camX*zoom),oy=Math.round(H/2-camY*zoom);
 const x0=Math.floor(-ox/zoom/TILE),x1=Math.floor((W-ox)/zoom/TILE);
 const y0=Math.floor(-oy/zoom/TILE),y1=Math.floor((H-oy)/zoom/TILE);
 ctx.imageSmoothingEnabled=true;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const dx=Math.round(ox+x*TILE*zoom),dy=Math.round(oy+y*TILE*zoom);
  const ex=Math.round(ox+(x+1)*TILE*zoom),ey=Math.round(oy+(y+1)*TILE*zoom);
  ctx.drawImage(getTile(x,y),dx,dy,ex-dx+1,ey-dy+1);
 }
}
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);render()}
canvas.addEventListener("pointerdown",e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;camX-=(e.clientX-drag.x)/zoom;camY-=(e.clientY-drag.y)/zoom;drag.x=e.clientX;drag.y=e.clientY;render()});
canvas.addEventListener("pointerup",()=>drag=null);canvas.addEventListener("pointercancel",()=>drag=null);
canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?.9:1.1),.75,1.5);render()},{passive:false});
const keys={};addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;const v=300*dt/zoom;let moved=false;
 if(keys.a||keys.arrowleft){camX-=v;moved=true}if(keys.d||keys.arrowright){camX+=v;moved=true}if(keys.w||keys.arrowup){camY-=v;moved=true}if(keys.s||keys.arrowdown){camY+=v;moved=true}
 if(moved)render();requestAnimationFrame(loop)}
resize();requestAnimationFrame(loop);
