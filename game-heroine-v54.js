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
// Broad terrain relief: directional sunlight and occlusion follow the same fixed world heightfield.
function elevation(x,y){return fractal(x/950,y/950,72)*.65+fractal(x/290,y/290,73)*.26+fractal(x/90,y/90,74)*.09}
function reliefLight(x,y){
 const left=elevation(x-12,y-12),right=elevation(x+12,y+12);
 const cross=elevation(x-12,y+12)-elevation(x+12,y-12);
 return clamp(.98+(left-right)*1.5+cross*.65,.73,1.22);
}
function groundColor(f,wx,wy,sun,dapples){
 const m=f.moss,s=f.soil,wet=f.mud,lit=f.open;
 let r=mix(56+lit*54,35+lit*30,m*.75),g=mix(85+lit*50,75+lit*44,m*.75),b=mix(42+lit*20,35+lit*17,m*.75);
 r=mix(r,134+lit*26,s*.91);g=mix(g,98+lit*22,s*.91);b=mix(b,58+lit*15,s*.91);
 r=mix(r,69,wet*.74);g=mix(g,62,wet*.74);b=mix(b,43,wet*.74);
 const fine=(hash(wx,wy,90)-.5)*17;
 const shade=0;
 return [clamp((r+fine+shade+dapples)*sun,0,255),clamp((g+fine+shade+dapples)*sun,0,255),clamp((b+fine*.8+shade+dapples*.7)*sun,0,255)];
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
// Ground-level raised structures are shaded before the smaller vegetation.
function counterZone(x,y){return x>-430&&x<430&&y>-440&&y<290}
function paintRelief(g,tx,ty){
 const CELL=150,MARGIN=100;
 const x0=Math.floor((tx*TILE-MARGIN)/CELL),x1=Math.ceil(((tx+1)*TILE+MARGIN)/CELL);
 const y0=Math.floor((ty*TILE-MARGIN)/CELL),y1=Math.ceil(((ty+1)*TILE+MARGIN)/CELL);
 for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){
  const r=rngAt(gx,gy,205),wx=(gx+r())*CELL,wy=(gy+r())*CELL;
  if(counterZone(wx,wy))continue;
  const x=wx-tx*TILE,y=wy-ty*TILE,f=landscape(wx,wy);
  if(r()<.45&&f.soil<.56){
   const rad=22+r()*24;
   const sh=g.createRadialGradient(x+9,y+9,1,x+9,y+9,rad*1.4);
   sh.addColorStop(0,"#102f2038");sh.addColorStop(1,"#102f2000");
   g.fillStyle=sh;g.fillRect(x-rad*1.5,y-rad*1.5,rad*3,rad*3);
   for(let i=0;i<7;i++){
    const a=r()*Math.PI*2,d=(.2+r()*.65)*rad,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
    ellipse(g,px,py,5+r()*7,2+r()*3,r()<.5?"#355d3280":"#9eb86d80");
   }
  }else if(r()<.21&&f.soil>.36){
   // Shallow exposed root: offset dark underside and warm illuminated ridge.
   const length=34+r()*46,angle=(r()-.5)*1.5;
   g.save();g.translate(x,y);g.rotate(angle);
   stroke(g,"#2a261c6b",6);g.beginPath();g.moveTo(-length*.5,4);g.quadraticCurveTo(0,-3,length*.5,3);g.stroke();
   stroke(g,"#866b48",4);g.beginPath();g.moveTo(-length*.5,0);g.quadraticCurveTo(0,-7,length*.5,-1);g.stroke();
   stroke(g,"#c0a078a0",1.4);g.beginPath();g.moveTo(-length*.5,-1);g.quadraticCurveTo(0,-8,length*.5,-2);g.stroke();g.restore();
  }
 }
}
function paintDetails(g,tx,ty){
 // Every feature belongs to a global cell, not to the rendering tile.
 // Include a border so features remain intact across tile edges.
 const CELL=42,MARGIN=65;
 const x0=Math.floor((tx*TILE-MARGIN)/CELL),x1=Math.ceil(((tx+1)*TILE+MARGIN)/CELL);
 const y0=Math.floor((ty*TILE-MARGIN)/CELL),y1=Math.ceil(((ty+1)*TILE+MARGIN)/CELL);
 for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){
  const rand=rngAt(gx,gy,17),wx=gx*CELL+rand()*CELL,wy=gy*CELL+rand()*CELL;
  if(counterZone(wx,wy))continue;
  const x=wx-tx*TILE,y=wy-ty*TILE,f=landscape(wx,wy),v=rand();
  const size=.75+rand()*.75;
  if(f.mud>.4&&v<.55)mud(g,x,y,rand,size);
  else if(f.soil>.68&&v<.4)leaf(g,x,y,rand,size);
  else if(v<.07+(1-f.open)*.05)rock(g,x,y,rand,size);
  else if(f.moss>.46&&v<.36)moss(g,x,y,rand,size);
  else if(f.damp>.47&&v<.35)fern(g,x,y,rand,size);
  else if(f.open>.46&&f.soil<.38&&v<.19)flower(g,x,y,rand,size);
  else if(f.soil<.65&&v<.82)grass(g,x,y,rand,size);
  else if(v<.65)leaf(g,x,y,rand,size*.75);
 }
 // A few extra tiny wildflowers in naturally sunny meadow pockets.
 // Stable positions and generous spacing keep the forest floor understated.
 const FCELL=105;
 const fx0=Math.floor((tx*TILE-25)/FCELL),fx1=Math.ceil(((tx+1)*TILE+25)/FCELL);
 const fy0=Math.floor((ty*TILE-25)/FCELL),fy1=Math.ceil(((ty+1)*TILE+25)/FCELL);
 for(let gy=fy0;gy<=fy1;gy++)for(let gx=fx0;gx<=fx1;gx++){
  const r=rngAt(gx,gy,312),wx=(gx+.2+r()*.6)*FCELL,wy=(gy+.2+r()*.6)*FCELL;
  if(counterZone(wx,wy))continue;
  const f=landscape(wx,wy);
  if(f.open>.42&&f.soil<.42&&f.mud<.15&&r()<.32){
   flower(g,wx-tx*TILE,wy-ty*TILE,r,.45+r()*.35);
  }
 }
 // Small sharp secondary details, seeded by absolute world cells.
 const S=12;
 const sx0=Math.floor(tx*TILE/S),sx1=Math.ceil((tx+1)*TILE/S);
 const sy0=Math.floor(ty*TILE/S),sy1=Math.ceil((ty+1)*TILE/S);
 for(let gy=sy0;gy<sy1;gy++)for(let gx=sx0;gx<sx1;gx++){
  const r=rngAt(gx,gy,61),wx=(gx+r())*S,wy=(gy+r())*S;
  if(counterZone(wx,wy))continue;
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
 for(let y=0;y<=N;y++){const row=[];for(let x=0;x<=N;x++)row.push({...landscape(tx*TILE+x*STEP,ty*TILE+y*STEP),sun:reliefLight(tx*TILE+x*STEP,ty*TILE+y*STEP),dapple:(fractal((tx*TILE+x*STEP)/225,(ty*TILE+y*STEP)/225,102)-.5)*28});fields.push(row)}
 for(let y=0;y<TILE;y++){
  const iy=y>>3,fy=(y%STEP)/STEP;
  for(let x=0;x<TILE;x++){
   const ix=x>>3,fx=(x%STEP)/STEP,a=fields[iy][ix],b=fields[iy][ix+1],c0=fields[iy+1][ix],d=fields[iy+1][ix+1],f={};
   for(const k of ["moss","soil","mud","open","sun","dapple"])f[k]=mix(mix(a[k],b[k],fx),mix(c0[k],d[k],fx),fy);
   const wx=tx*TILE+x,wy=ty*TILE+y,color=groundColor(f,wx,wy,f.sun,f.dapple*(1-f.open*.6)),i=(y*TILE+x)*4;
   p[i]=color[0];p[i+1]=color[1];p[i+2]=color[2];p[i+3]=255;
  }
 }
 g.putImageData(image,0,0);paintRelief(g,tx,ty);paintDetails(g,tx,ty);return c;
}
function getTile(x,y){const key=x+","+y;if(cache.has(key)){const t=cache.get(key);cache.delete(key);cache.set(key,t);return t}const t=makeTile(x,y);cache.set(key,t);if(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);return t}
// Hand-drawn, open-backed market counter. The center is a walkable plank floor,
// with service surfaces only on three sides; no baked-in ground decorations.
// Counter is rendered on its own foreground canvas, above ground and moving grass.
const counterCanvas=document.createElement("canvas"),counterCtx=counterCanvas.getContext("2d");
Object.assign(counterCanvas.style,{position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"3"});
document.body.appendChild(counterCanvas);
function drawCounter(){
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2+(-65-camY)*zoom);g.scale(zoom,zoom);
 const poly=(a,c,e="#4b3225",w=2)=>{g.beginPath();g.moveTo(...a[0]);for(let i=1;i<a.length;i++)g.lineTo(...a[i]);g.closePath();g.fillStyle=c;g.fill();if(e){g.strokeStyle=e;g.lineWidth=w;g.lineJoin="round";g.stroke()}};
 const line=(a,b,c,w=2)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=c;g.lineWidth=w;g.lineCap="round";g.stroke()};
 const curve=(pts,c,w=2)=>{g.beginPath();g.moveTo(pts[0],pts[1]);g.bezierCurveTo(...pts.slice(2));g.strokeStyle=c;g.lineWidth=w;g.lineCap="round";g.stroke()};
 // Original fairytale-storybook carved oak counter, broad enough for the merchant.
 // Open at the back, with no canopy or stall structure obscuring his face.
 ellipse(g,0,48,110,19,"#1d2d2066");
 // Solid turned feet and aged side posts.
 for(const x of [-96,96]){
  poly([[x-8,20],[x+8,20],[x+10,64],[x-11,64]],"#63402c","#3a291f",2.5);
  poly([[x-12,58],[x+12,58],[x+10,66],[x-10,66]],"#855a3a","#4a3123",2);
  line([x-4,27],[x-4,57],"#bb8655",2);
 }
 // Broad front panel: several inset arched hand-carved oak panels.
 poly([[-105,-9],[105,-9],[101,51],[-101,51]],"#66432e","#39271f",3);
 poly([[-99,-3],[99,-3],[96,45],[-96,45]],"#966b44","#593b29",2);
 for(let i=0;i<5;i++){
  const x=-79+i*39.5;
  poly([[x-17,3],[x+17,3],[x+16,39],[x-16,39]],i%2?"#835a3b":"#8b6040","#523725",1.5);
  g.beginPath();g.moveTo(x-12,36);g.lineTo(x-12,17);g.quadraticCurveTo(x-12,7,x,7);g.quadraticCurveTo(x+12,7,x+12,17);g.lineTo(x+12,36);g.closePath();
  g.fillStyle=i%2?"#714d35":"#79543a";g.fill();g.strokeStyle="#c79b66";g.lineWidth=1.4;g.stroke();
  curve([x-8,30,x-2,25,x+1,21,x+7,14],"#c3986290",1.2);
  ellipse(g,x,34,2,2,"#d6ae71");
 }
 // Long polished wooden worktop, with an overhang and a warm golden edge.
 poly([[-119,-16],[116,-16],[125,0],[-127,0]],"#71472e","#39271e",3.5);
 poly([[-118,-21],[114,-21],[116,-13],[-119,-13]],"#d5a16b","#65432c",2.5);
 poly([[-115,-29],[111,-29],[118,-21],[-119,-21]],"#ad794c","#553926",2.5);
 line([-114,-24],[108,-24],"#edc48b",2);
 line([-123,-2],[121,-2],"#c99561",2.4);
 // Natural wood grain follows the width, not repetitive straight stripes.
 for(let i=0;i<9;i++){
  const x=-106+i*25;
  curve([x,-9,x+6,-12,x+14,-6,x+19,-10],i%2?"#b7845688":"#50352566",1);
 }
 // Carved scrollwork on both end brackets.
 for(const sign of [-1,1]){
  g.save();g.scale(sign,1);
  poly([[104,-8],[114,-8],[114,19],[103,28],[97,25],[105,13]],"#5d3d2b","#38281f",1.5);
  curve([104,19,113,11,99,5,105,1],"#d5a16c",2);
  curve([102,27,91,22,99,15,103,17],"#b88758",1.6);
  g.restore();
 }
 // Hand-carved central crest: oak leaves, curling vines and an amber gem.
 ellipse(g,0,46,19,8,"#49382b");
 ellipse(g,0,45,15,6,"#6b8055");
 for(const sign of [-1,1]){
  g.save();g.scale(sign,1);
  curve([0,46,7,38,10,43,14,44],"#d7b779",1.8);
  ellipse(g,10,42,4,2.4,"#a6b17b",-.45);
  g.restore();
 }
 ellipse(g,0,45,3.5,3.5,"#e5b36a");ellipse(g,-1,44,1.2,1.2,"#ffe1a2");
 // Little brass fasteners, subtle enough to keep the face of the counter readable.
 for(const x of [-107,107]){ellipse(g,x,-10,2.5,2.5,"#e2b97b");ellipse(g,x,-10,1,1,"#80603d")}
 g.restore();
}
// Stable merchant animation: never use damaged hair/beard sprite cutouts.
// Keep the approved complete portrait intact during acknowledgement and sales.
let merchantSaleStart=-1,merchantSaleKind="wood";
const merchantSprites={};
for(const name of ["idle_a","idle_b","give_wood"]){
 const im=new Image();im.decoding="async";im.src="./assets/"+name+".png";
 im.onload=()=>{merchantSprites[name]=im;renderForeground(performance.now())};
 im.onerror=()=>console.warn("Merchant sprite unavailable:",name);
}
function startMerchantSale(kind="wood"){merchantSaleKind=kind==="meat"?"meat":"wood";merchantSaleStart=performance.now()}
function drawMerchant(time=performance.now()){
 const g=counterCtx,elapsed=merchantSaleStart<0?999:(time-merchantSaleStart)/1000;
 const sale=elapsed<2.45;
 let pose="idle_a";
 if(sale&&elapsed>.72&&elapsed<1.85&&merchantSaleKind==="wood"&&merchantSprites.give_wood)pose="give_wood";
 const sprite=merchantSprites[pose]||merchantSprites.idle_a;
 if(!sprite||!sprite.complete||!sprite.naturalWidth)return;
 const t=time*.001;
 // A visible greeting on each sale, plus an occasional natural idle nod.
 const greeting=sale&&elapsed<.72?Math.sin(Math.PI*elapsed/.72):0;
 const idlePhase=(t%8.5);
 const idleNod=!sale&&idlePhase>5.5&&idlePhase<6.4?Math.sin(Math.PI*(idlePhase-5.5)/.9)*.5:0;
 const nod=Math.max(greeting,idleNod);
 const bob=Math.sin(t*1.6)*.5;
 const height=140,width=height*sprite.naturalWidth/sprite.naturalHeight;
 const x=-width/2,y=-180+bob;
 g.save();
 g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom,zoom);
 // Pivot the entire intact sprite around the neck/shoulders.
 // This avoids double heads, missing beard/hair and broken sprite masks.
 const pivotX=0,pivotY=y+height*.44;
 g.translate(pivotX,pivotY);
 g.rotate(nod*.105);
 g.translate(-pivotX,-pivotY+nod*4.2);
 g.drawImage(sprite,x,y,width,height);
 g.restore();
}
function drawFort(){
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom*1.92,zoom*1.92);
 const poly=(a,c,e="#493626",w=2)=>{g.beginPath();g.moveTo(...a[0]);for(let i=1;i<a.length;i++)g.lineTo(...a[i]);g.closePath();g.fillStyle=c;g.fill();if(e){g.strokeStyle=e;g.lineWidth=w;g.stroke()}};
 const line=(a,b,c,w=2)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=c;g.lineWidth=w;g.lineCap="round";g.stroke()};
 const post=(x,y,h=73,seed=0)=>{
  const tone=hash(Math.round(x),Math.round(y),seed)>.52?"#956b45":"#795336";
  poly([[x-6.3,y],[x+6.3,y],[x+6.3,y-h+11],[x,y-h-3],[x-6.3,y-h+11]],tone,"#453124",1.4);
  line([x-3,y-8],[x-3,y-h+15],"#d7aa7490",1.5);
  line([x+3,y-12],[x+3,y-h+19],"#4b322855",1);
  if(hash(Math.round(x),Math.round(y),91)>.65)line([x-1,y-35],[x+2,y-27],"#47302188",.9);
 };
 // A single enclosed timber enclosure with coherent rear and side corners.
 ellipse(g,0,0,210,165,"#24382155");
 poly([[-174,-115],[174,-115],[184,119],[-184,119]],"#a58b6155",null);
 for(let i=0;i<24;i++){const x=(hash(i,9,18)-.5)*330,y=(hash(i,7,22)-.5)*207;ellipse(g,x,y,2.5,1.3,"#c6ae7977")}
 // Back wall: two bracing beams tie every pointed stake together.
 for(let x=-174;x<=174;x+=12)post(x,-115,75,8);
 // Back braces concealed behind the palisade to avoid floating brown lines.
 
 
 // Side palisades follow the angled perimeter, rather than floating apart.
 for(let i=0;i<=19;i++){
  const t=i/19,y=-115+234*t,x=174+10*t;
  post(-x,y,73-8*t,11);post(x,y,73-8*t,12);
 }
 // Raised corner watchtowers: broad open decks for future archer characters.
 for(const x of [-174,174]){
  ellipse(g,x,-111,33,12,"#2b241d66");
  // Four tall supports visibly meet the palisade corner.
  for(const dx of [-24,24]){
   poly([[x+dx-6,-112],[x+dx+6,-112],[x+dx+6,-177],[x+dx-6,-177]],"#79543a","#3d2a21",2);
   line([x+dx-3,-119],[x+dx-3,-166],"#b58a5c",1.7);
  }
  // Cross bracing belongs to the tower, not across the interior yard.
  line([x-23,-136],[x+23,-163],"#563a2a",4);
  line([x+23,-136],[x-23,-163],"#563a2a",4);
  // Wide elevated floor, projecting slightly past its supports.
  poly([[x-39,-177],[x+39,-177],[x+34,-166],[x-34,-166]],"#9c724a","#483223",2.5);
  poly([[x-38,-181],[x+38,-181],[x+34,-175],[x-34,-175]],"#c09764","#553a28",2);
  for(let d=-25;d<=25;d+=12)line([x+d,-180],[x+d+2,-175],"#6b492f",1.2);
  // Short crenellated parapet, deliberately leaving an open center for archers.
  for(const side of [-1,1]){
   const px=x+side*34;
   poly([[px-7,-182],[px+7,-182],[px+7,-202],[px,-207],[px-7,-202]],"#9a724d","#493323",2);
   line([px-3,-185],[px-3,-199],"#d1a476",1.5);
  }
  // Low rear rail, archer silhouette can stand unobstructed above the deck.
  poly([[x-29,-185],[x+29,-185],[x+29,-191],[x-29,-191]],"#705037","#3c2c22",1.8);
  for(const dx of [-23,0,23])ellipse(g,x+dx,-188,2,1.5,"#d7b078");
 }
 g.restore();
}
function drawFortGate(){
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom*1.92,zoom*1.92);
 const poly=(a,c,e="#493525",w=2)=>{g.beginPath();g.moveTo(...a[0]);for(let i=1;i<a.length;i++)g.lineTo(...a[i]);g.closePath();g.fillStyle=c;g.fill();if(e){g.strokeStyle=e;g.lineWidth=w;g.stroke()}};
 const line=(a,b,c,w=2)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=c;g.lineWidth=w;g.lineCap="round";g.stroke()};
 // Front fence meets the side walls exactly; the broad central gate stays open.
 for(const side of [-1,1]){
  for(let k=0;k<12;k++){
   const x=side*(55+k*11.8),y=119,h=65+(k%3)*3;
   poly([[x-6,y],[x+6,y],[x+6,y-h+12],[x,y-h-3],[x-6,y-h+12]],k%3===0?"#a17a50":"#88603d","#473223",1.5);
   line([x-3,y-9],[x-3,y-h+15],"#d5ac7b99",1.3);
  }
  
  
  
 }
 // Proper gateposts with an overhead lintel and open folding doors.
 for(const x of [-49,49]){
  poly([[x-10,124],[x+10,124],[x+10,30],[x-10,30]],"#65452f","#382a20",2.8);
  line([x-5,39],[x-5,115],"#c09a6b",2);
  poly([[x-15,31],[x,10],[x+15,31]],"#59754f","#334b3a",2);
 }
 poly([[-59,28],[59,28],[59,43],[-59,43]],"#775338","#3c2c21",2.5);
 line([-54,32],[54,32],"#d8b37c",2);
 // Doors are visibly swung outward, not blocking the customers' path.
 poly([[-47,63],[-30,73],[-32,116],[-47,118]],"#9b754e","#513b29",2);
 poly([[47,63],[30,73],[32,116],[47,118]],"#9b754e","#513b29",2);
 for(const x of [-41,41]){ellipse(g,x,83,2,3,"#d8b775");ellipse(g,x,105,2,3,"#d8b775")}
 g.restore();
}

/* Emberhold heroine: articulated hand-painted canvas character, axe kept in hand.
   All parts share the same transforms, so hair, limbs and weapon stay attached. */
const heroine={x:0,y:425,dir:1,walk:0,move:false,attackAt:-10000,target:null};
function heroineAttack(){if(performance.now()-heroine.attackAt>650)heroine.attackAt=performance.now()}
// Illustrated heroine: the PNG sprites are the only character renderer.
const heroineFrames={idle:[],walk_side:[],walk_front:[],walk_back:[],attack:[]};
for(const [state,count] of Object.entries({idle:5,walk_side:9,walk_front:7,walk_back:7,attack:4})){
 for(let n=0;n<count;n++){
  const picture=new Image();
  picture.src="./assets/"+state+"_"+String(n).padStart(2,"0")+".png";
  heroineFrames[state].push(picture);
 }
}
// Dedicated top-layer illustrated heroine, independent of foreground canvas clearing.
const heroineElement=document.createElement("img");
heroineElement.alt="Heldin";heroineElement.draggable=false;
Object.assign(heroineElement.style,{position:"fixed",zIndex:"9",pointerEvents:"none",display:"block",margin:"0",padding:"0",border:"0",maxWidth:"none",maxHeight:"none",width:"180px",height:"248px",objectFit:"contain",objectPosition:"center center",left:"50%",top:"50%",transformOrigin:"center bottom",userSelect:"none"});
document.body.appendChild(heroineElement);
let shownHeroineFrame="";
function drawHeroine(now=performance.now()){
 const age=(now-heroine.attackAt)/1000,attacking=age>=0&&age<.64;
 const dx=joystick.x+(keys.l||keys.arrowright?1:0)-(keys.j||keys.arrowleft?1:0);
 const dy=joystick.y+(keys.k||keys.arrowdown?1:0)-(keys.i||keys.arrowup?1:0);
 let state="idle",index=Math.floor(now/240)%heroineFrames.idle.length;
 if(attacking){state="attack";index=Math.min(3,Math.floor(age/.64*4));}
 else if(heroine.move){state=Math.abs(dy)>Math.abs(dx)*1.25?(dy<0?"walk_back":"walk_front"):"walk_side";index=Math.floor(heroine.walk*3.2)%heroineFrames[state].length;}
 const requested=heroineFrames[state][index];
 const frame=requested&&requested.complete&&requested.naturalWidth?requested:heroineFrames.idle.find(i=>i.complete&&i.naturalWidth);
 if(!frame){heroineElement.style.visibility="hidden";return;}
 heroineElement.style.visibility="visible";
 if(shownHeroineFrame!==frame.src){heroineElement.src=frame.src;shownHeroineFrame=frame.src;}
 // The visible figure occupies about 178 of the PNG's 248 pixels.
 // 170 world pixels gives a 122px figure, matching the merchant's 122px silhouette.
 const height=Math.min(170*zoom,H*.5,W*.8*frame.naturalHeight/frame.naturalWidth);
 const width=height*frame.naturalWidth/frame.naturalHeight;
 // Keep the whole frame below the HUD, including during camera easing and resize.
 const x=clamp(W/2+(heroine.x-camX)*zoom,width/2+8,W-width/2-8);
 const y=clamp(H/2+(heroine.y-camY)*zoom,height+64,H-16);
 heroineElement.style.left=x+"px";heroineElement.style.top=y+"px";
 heroineElement.style.width=width+"px";
 heroineElement.style.height=height+"px";
 heroineElement.style.transform="translate(-50%,-100%) scaleX("+(heroine.dir<0?-1:1)+")";
}
// Floating touchscreen joystick; movement follows finger displacement.
const joystick={x:0,y:0,pointer:null};
const joyBase=document.createElement("div"),joyKnob=document.createElement("div");
Object.assign(joyBase.style,{position:"fixed",right:"24px",bottom:"24px",width:"126px",height:"126px",borderRadius:"50%",background:"#342b2588",border:"3px solid #e7c58e",boxShadow:"inset 0 0 18px #0008,0 4px 16px #0005",zIndex:"12",touchAction:"none",userSelect:"none"});
Object.assign(joyKnob.style,{position:"absolute",left:"37px",top:"37px",width:"52px",height:"52px",borderRadius:"50%",background:"radial-gradient(circle at 35% 30%,#d8b783,#85603d)",border:"2px solid #4b3225",boxShadow:"0 3px 8px #0007",pointerEvents:"none"});
joyBase.appendChild(joyKnob);document.body.appendChild(joyBase);
function setJoystick(e){
 const rect=joyBase.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy;const len=Math.hypot(dx,dy),max=39;
 if(len>max){dx*=max/len;dy*=max/len}
 joystick.x=dx/max;joystick.y=dy/max;
 joyKnob.style.transform="translate("+dx+"px,"+dy+"px)";
}
function stopJoystick(){joystick.pointer=null;joystick.x=0;joystick.y=0;joyKnob.style.transform="translate(0,0)"}
joyBase.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();joystick.pointer=e.pointerId;joyBase.setPointerCapture(e.pointerId);setJoystick(e)});
joyBase.addEventListener("pointermove",e=>{if(e.pointerId===joystick.pointer){e.preventDefault();setJoystick(e)}});
joyBase.addEventListener("pointerup",e=>{if(e.pointerId===joystick.pointer)stopJoystick()});
joyBase.addEventListener("pointercancel",stopJoystick);
window.addEventListener("blur",stopJoystick);
const gatheredTrees=new Set();
const treeChops=new Map();
const fallenWood=[];
let woodCarried=0;
function paintLog(g,x,y,scale=1,angle=0){
 g.save();g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
 g.fillStyle="#38281d55";g.beginPath();g.ellipse(1,6,20,5,0,0,Math.PI*2);g.fill();
 g.fillStyle="#69432b";g.strokeStyle="#39291d";g.lineWidth=1.5;
 g.beginPath();g.moveTo(-17,-8);g.bezierCurveTo(-5,-12,9,-11,18,-7);g.lineTo(18,5);g.bezierCurveTo(7,8,-7,7,-17,5);g.closePath();g.fill();g.stroke();
 g.fillStyle="#a77445";g.beginPath();g.moveTo(-16,-7);g.quadraticCurveTo(0,-11,16,-7);g.lineTo(16,-4);g.quadraticCurveTo(0,-8,-16,-4);g.fill();
 for(const yy of [-2,2]){g.strokeStyle=yy<0?"#d5a06b":"#4b3324";g.lineWidth=1;g.beginPath();g.moveTo(-12,yy);g.bezierCurveTo(-3,yy-2,5,yy+2,12,yy-1);g.stroke()}
 g.fillStyle="#cda474";g.strokeStyle="#67452c";g.lineWidth=1.5;g.beginPath();g.ellipse(18,-1,5.5,7,0,0,Math.PI*2);g.fill();g.stroke();
 g.strokeStyle="#986b43";g.lineWidth=1;g.beginPath();g.ellipse(18,-1,3.2,4.7,0,0,Math.PI*2);g.stroke();g.beginPath();g.ellipse(18,-1,1.4,2.2,0,0,Math.PI*2);g.stroke();
 g.strokeStyle="#e0b680";g.lineWidth=1.2;g.beginPath();g.moveTo(-12,-7);g.lineTo(-4,-9);g.stroke();
 g.restore();
}
function drawFallenWood(){
 const g=treeCtx;g.save();g.setTransform(dpr,0,0,dpr,0,0);
 for(const pile of fallenWood){if(pile.taken)continue;const x=W/2+(pile.x-camX)*zoom,y=H/2+(pile.y-camY)*zoom;
  g.save();g.translate(x,y);g.scale(zoom,zoom);
  paintLog(g,-8,1,.85,-.14);paintLog(g,10,-5,.9,.12);paintLog(g,-1,-12,.9,-.06);
  g.restore();
 }g.restore();
}
let woodStored=0;
const woodHud=document.createElement("div");
woodHud.id="emberhold-wood-inventory";
Object.assign(woodHud.style,{position:"fixed",top:"max(22px, env(safe-area-inset-top))",left:"22px",zIndex:"20",padding:"11px 16px",border:"2px solid #b58b56",borderRadius:"13px",background:"linear-gradient(145deg,#322719ee,#5a3d27ed)",color:"#f7e5bd",font:"bold 19px Georgia,serif",boxShadow:"0 5px 18px #0006",pointerEvents:"none",whiteSpace:"nowrap"});
document.body.appendChild(woodHud);
function updateWoodHud(){woodHud.textContent="🪵 Holz im Inventar: "+woodCarried.toLocaleString("de-DE");}
updateWoodHud();
function drawWoodStorage(){
 if(!woodStored)return;
 const g=counterCtx;
 g.save();g.translate(W/2+(245-camX)*zoom,H/2+(-10-camY)*zoom);g.scale(zoom*.55,zoom*.55);
 const visible=Math.min(woodStored,120),rows=Math.ceil(visible/7);
 g.fillStyle="#29201666";g.beginPath();g.ellipse(0,6,91,19,0,0,Math.PI*2);g.fill();
 // Timber rack, with carved uprights and a raised wooden base.
 g.fillStyle="#503621";g.strokeStyle="#271e18";g.lineWidth=3;
 g.fillRect(-85,-rows*9-10,10,rows*9+26);g.strokeRect(-85,-rows*9-10,10,rows*9+26);
 g.fillRect(76,-rows*9-10,10,rows*9+26);g.strokeRect(76,-rows*9-10,10,rows*9+26);
 for(let i=0;i<visible;i++){const row=Math.floor(i/7),col=i%7;
  paintLog(g,-64+col*21,-7-row*9,.57,(col%3-1)*.045);
 }
 g.fillStyle="#9b7046";g.fillRect(-88,4,177,8);
 g.fillStyle="#d3a66c";g.fillRect(-87,4,174,2);
 g.restore();
}
let lastAutoTarget=null;
function nearbyAttackTarget(){
 const h=heroine;
 let best=null,dist=Infinity;
 // Trees are already placed procedurally. Attack only actual trunks, not the canopy.
 for(const tree of trees){
  if(gatheredTrees.has(tree.x.toFixed(1)+":"+tree.y.toFixed(1)))continue;
  const d=Math.hypot(tree.x-h.x,tree.y-h.y);
  if(d<72&&d<dist){best={kind:"tree",obj:tree};dist=d}
 }
 // Future bears can join this same combat detection once spawned in the world.
 if(typeof bears!=="undefined"&&Array.isArray(bears))for(const bear of bears){
  if(bear.health<=0)continue;
  const d=Math.hypot(bear.x-h.x,bear.y-h.y);
  if(d<85&&d<dist){best={kind:"bear",obj:bear};dist=d}
 }
 return best;
}
// Solid obstacles in world coordinates: palisade, watchtower corners and merchant counter.
function blockedAt(x,y){
 const radius=14;
 const rect=(x1,y1,x2,y2)=>x+radius>x1&&x-radius<x2&&y+radius>y1&&y-radius<y2;
 // Fort rear wall and side palisades (fort scale 1.92).
 if(rect(-350,-240,350,-214))return true;
 if(rect(-365,-235,-322,245)||rect(322,-235,365,245))return true;
 // Front wall, with a central opening at the gate.
 if(rect(-365,211,-110,249)||rect(110,211,365,249))return true;
 // Only the gatepost bases are solid. Their projected height and overhead lintel
 // must not create invisible walls across the courtyard.
 if(rect(-114,218,-74,243)||rect(74,218,114,243))return true;
 // Open door leaves stay beside the passage at the threshold.
 if(rect(-94,222,-58,238)||rect(58,222,94,238))return true;
 // Merchant counter: cannot walk through or stand on the worktop.
 if(rect(-132,-85,132,4))return true;
 if(rect(195,-17,295,1))return true;
 return false;
}
function heroineTick(dt,now){
 const h=heroine;
 let dx=joystick.x,dy=joystick.y;
 if(keys.j||keys.arrowleft)dx-=1;if(keys.l||keys.arrowright)dx+=1;
 if(keys.i||keys.arrowup)dy-=1;if(keys.k||keys.arrowdown)dy+=1;
 const len=Math.hypot(dx,dy);h.move=len>.12;
 if(h.move){
  const speed=60*Math.min(1,len);
  const stepX=dx/len*speed*dt,stepY=dy/len*speed*dt;
  if(!blockedAt(h.x+stepX,h.y))h.x+=stepX;
  if(!blockedAt(h.x,h.y+stepY))h.y+=stepY;
  if(Math.abs(dx)>.08)h.dir=dx<0?-1:1;
  h.walk+=dt*speed/60;
 }
 for(const pile of fallenWood){if(!pile.taken&&Math.hypot(pile.x-h.x,pile.y-h.y)<52){pile.taken=true;woodCarried+=3;updateWoodHud();}}
 // Deposit everything automatically when approaching the merchant's counter.
 if(woodCarried>0&&Math.abs(h.x)<100&&h.y>=22&&h.y<95){
  woodStored+=woodCarried;woodCarried=0;updateWoodHud();
 }
 const target=nearbyAttackTarget();
 if(target&&now-h.attackAt>920){
  if(target.obj.x!==undefined&&Math.abs(target.obj.x-h.x)>8)h.dir=target.obj.x<h.x?-1:1;
  heroineAttack();lastAutoTarget=target;
  // Damage is applied at the impact phase, not at the beginning of the swing.
 }
 if(lastAutoTarget&&now-h.attackAt>=320){
  const target=lastAutoTarget;
  if(target.kind==="tree"){
   const tree=target.obj,key=tree.x.toFixed(1)+":"+tree.y.toFixed(1);
   tree.chops=(treeChops.get(key)||0)+1;treeChops.set(key,tree.chops);
   if(tree.chops>=3){gatheredTrees.add(key);tree.removed=true;fallenWood.push({x:tree.x,y:tree.y,taken:false});}
  }else if(target.kind==="bear")target.obj.health=(target.obj.health??3)-1;
  lastAutoTarget=null;
 }
}
function renderForeground(now=performance.now()){
 counterCtx.setTransform(1,0,0,1,0,0);
 counterCtx.clearRect(0,0,counterCanvas.width,counterCanvas.height);
 counterCtx.setTransform(dpr,0,0,dpr,0,0);
 drawFort();drawMerchant(now);drawCounter();drawFortGate();drawWoodStorage();drawHeroine(now);
}
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
 renderForeground();
 if(windCanvas.width){const now=performance.now();drawWind(now);drawTrees(now)}
}
// Wind lives on a transparent overlay: the expensive ground tiles never redraw for animation.
const windCanvas=document.createElement("canvas"),windCtx=windCanvas.getContext("2d");
windCanvas.setAttribute("aria-hidden","true");
Object.assign(windCanvas.style,{position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"1"});
document.body.appendChild(windCanvas);
let windTufts=[],windDirty=true,lastWindFrame=0,windAnchorX=0,windAnchorY=0;
function rebuildWind(){
 windTufts=[];windAnchorX=camX;windAnchorY=camY;const STEP=58,margin=200;
 const left=camX-W/(2*zoom)-margin,right=camX+W/(2*zoom)+margin;
 const top=camY-H/(2*zoom)-margin,bottom=camY+H/(2*zoom)+margin;
 for(let gy=Math.floor(top/STEP);gy<=Math.ceil(bottom/STEP);gy++)for(let gx=Math.floor(left/STEP);gx<=Math.ceil(right/STEP);gx++){
  const r=rngAt(gx,gy,990),wx=(gx+.12+r()*.76)*STEP,wy=(gy+.12+r()*.76)*STEP;
  const f=landscape(wx,wy);
  if(counterZone(wx,wy)||f.soil>.56||f.mud>.3||r()>.8)continue;
  windTufts.push({x:wx,y:wy,h:11+r()*12,lean:(r()-.5)*3,phase:r()*6.283,seed:r()*6.283,
   strength:.45+r()*.65,shade:r()>.5?"rgba(174,201,112,.84)":"rgba(45,94,49,.85)"});
 }
 windDirty=false;
}
function drawWind(time){
 if(document.hidden)return;
 if(windDirty||Math.abs(camX-windAnchorX)>115||Math.abs(camY-windAnchorY)>115)rebuildWind();
 windCtx.setTransform(1,0,0,1,0,0);windCtx.clearRect(0,0,windCanvas.width,windCanvas.height);
 windCtx.setTransform(dpr,0,0,dpr,0,0);
 const ox=W/2-camX*zoom,oy=H/2-camY*zoom,t=time*.001;
 for(const a of windTufts){
  const x=ox+a.x*zoom,y=oy+a.y*zoom;
  if(x< -30||x>W+30||y< -30||y>H+30)continue;
  // A coherent gust moves across the whole world; each tuft bends slightly differently.
  const gust=Math.sin(t*1.15-a.x*.003+a.y*.0018)*.7+Math.sin(t*2.05+a.phase)*.3;
  const bend=(gust*a.strength*5+a.lean)*zoom,h=a.h*zoom;
  windCtx.lineCap="round";windCtx.lineWidth=Math.max(.65,zoom*.95);windCtx.strokeStyle=a.shade;
  for(let k=-1;k<=1;k++){
   const bx=x+k*3.2*zoom,by=y+(k===0?0:1.4)*zoom;
   windCtx.beginPath();windCtx.moveTo(bx,by);
   windCtx.quadraticCurveTo(bx+bend*.2,by-h*.65,bx+bend+(k*2.1)*zoom,by-h*(k===0?1:.75));windCtx.stroke();
  }
 }
}

// Deterministic woodland trees. Trunks stay rooted; branches and leafy crowns sway in the wind.
const treeCanvas=document.createElement("canvas"),treeCtx=treeCanvas.getContext("2d");
treeCanvas.setAttribute("aria-hidden","true");
Object.assign(treeCanvas.style,{position:"fixed",inset:"0",width:"100%",height:"100%",pointerEvents:"none",zIndex:"2"});
document.body.appendChild(treeCanvas);
let trees=[],treeAnchorX=Infinity,treeAnchorY=Infinity;
// Fresh random forest arrangement on every new visit, stable while exploring.
const treeWorldSeed=Math.floor(Math.random()*2147483647);
function rebuildTrees(){
 trees=[];treeAnchorX=camX;treeAnchorY=camY;
 const step=190,margin=330;
 const left=camX-W/(2*zoom)-margin,right=camX+W/(2*zoom)+margin;
 const top=camY-H/(2*zoom)-margin,bottom=camY+H/(2*zoom)+margin;
 for(let gy=Math.floor(top/step);gy<=Math.ceil(bottom/step);gy++)
 for(let gx=Math.floor(left/step);gx<=Math.ceil(right/step);gx++){
  const r=rngAt(gx,gy,treeWorldSeed),x=(gx+.08+r()*.84)*step,y=(gy+.08+r()*.84)*step;
  const f=landscape(x,y);
  // Wide protected clearing for fort, gate, queues and future wood/meat stores.
  if(Math.abs(x)<660&&Math.abs(y)<575)continue;
  if(f.soil>.57||f.mud>.48||r()>.75)continue;
  const size=.76+r()*.55,kind=r()>.38?"broad":"fir";
  if(!gatheredTrees.has(x.toFixed(1)+':'+y.toFixed(1)))trees.push({x,y,size,kind,phase:r()*6.283,shade:r(),lean:(r()-.5)*.7});
 }
 trees.sort((a,b)=>a.y-b.y);
}
function drawTrees(time){
 if(document.hidden)return;
 if(!trees.length||Math.abs(camX-treeAnchorX)>90||Math.abs(camY-treeAnchorY)>90)rebuildTrees();
 const g=treeCtx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,treeCanvas.width,treeCanvas.height);
 g.setTransform(dpr,0,0,dpr,0,0);
 const ox=W/2-camX*zoom,oy=H/2-camY*zoom,t=time*.001;
 for(const a of trees){
  if(a.removed||gatheredTrees.has(a.x.toFixed(1)+':'+a.y.toFixed(1)))continue;
  const x=ox+a.x*zoom,y=oy+a.y*zoom,scale=zoom*a.size;
  if(x< -160*scale||x>W+160*scale||y< -230*scale||y>H+120*scale)continue;
  g.save();g.translate(x,y);g.scale(scale,scale);
  ellipse(g,13,5,51,17,"#152b1d55",-.12);
  // Gnarled grounded trunk with stationary roots.
  g.fillStyle="#503927";g.beginPath();g.moveTo(-12,0);g.bezierCurveTo(-9,-39,-16,-72,-6,-118);
  g.lineTo(8,-118);g.bezierCurveTo(12,-65,7,-32,12,0);
  g.lineTo(25,10);g.lineTo(5,5);g.lineTo(-6,7);g.lineTo(-26,12);g.closePath();g.fill();
  g.strokeStyle="#a18156";g.lineWidth=3;g.beginPath();g.moveTo(-4,-5);g.bezierCurveTo(0,-46,-7,-76,0,-106);g.stroke();
  g.strokeStyle="#32291f";g.lineWidth=2;g.beginPath();g.moveTo(5,-8);g.lineTo(11,5);g.stroke();
  // Flexible upper branches move subtly; no snapping of the tree base.
  const sway=Math.sin(t*.82+a.phase)*8.5+Math.sin(t*1.31+a.x*.002)*4.5+a.lean;
  g.save();g.translate(0,-112);g.rotate(sway*.007);
  g.strokeStyle="#62452c";g.lineCap="round";
  for(const side of [-1,1]){g.lineWidth=7;g.beginPath();g.moveTo(0,28);g.quadraticCurveTo(side*27,-8,side*52,-17);g.stroke()}
  if(a.kind==="fir"){
   // Layered, irregular spruce boughs with a gently tapered silhouette.
   const dark=["#294735","#31553a","#3b6240","#486e47"],light=["#587c50","#73915a","#8ca66a"];
   for(let layer=0;layer<5;layer++){
    const yy=27-layer*24,w=69-layer*11;
    g.fillStyle=dark[(layer+(a.shade>.5?1:0))%dark.length];
    g.beginPath();g.moveTo(-4,yy-73);
    g.bezierCurveTo(-w*.35,yy-32,-w*.65,yy-5,-w,yy+12);
    g.quadraticCurveTo(-w*.68,yy+17,-w*.43,yy+10);
    g.quadraticCurveTo(0,yy+22,w*.35,yy+9);
    g.quadraticCurveTo(w*.7,yy+18,w,yy+11);
    g.bezierCurveTo(w*.52,yy-13,w*.27,yy-45,-4,yy-73);
    g.fill();
    g.strokeStyle="#203f30a8";g.lineWidth=1.5;g.stroke();
    g.strokeStyle=light[layer%light.length]+"b0";g.lineWidth=2;
    g.beginPath();g.moveTo(-w*.65,yy+3);g.quadraticCurveTo(-w*.15,yy-3,w*.47,yy+2);g.stroke();
    for(let j=0;j<5;j++){
     const xx=(j-2)*w*.31;
     g.strokeStyle=j%2?"#9bad72a0":"#71975e99";g.lineWidth=1;
     g.beginPath();g.moveTo(xx,yy+4);g.lineTo(xx-5,yy+10+(j%2)*3);g.stroke();
    }
   }
  }else{
   // Organic lobed canopy, instead of overlapping perfect circles.
   const palette=a.shade>.58?["#355c3d","#477449","#5f8854","#86a26a"]:["#2e593c","#416c46","#57804d","#79965d"];
   const clusters=[[-47,-28,43,36,0],[40,-29,45,37,1],[-17,-58,54,40,1],[13,-20,59,37,0],[-27,-79,34,29,2],[35,-67,35,28,2]];
   for(let i=0;i<clusters.length;i++){
    const [dx,dy,rx,ry,col]=clusters[i];
    g.beginPath();
    const n=12;
    for(let k=0;k<=n;k++){
     const theta=k*Math.PI*2/n,variation=1+.095*Math.sin(k*2.7+i*1.8);
     const px=dx+Math.cos(theta)*rx*variation,py=dy+Math.sin(theta)*ry*variation;
     if(k===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.closePath();g.fillStyle=palette[col];g.fill();
    g.strokeStyle="#244a3680";g.lineWidth=1.3;g.stroke();
   }
   // Smaller overlapping leafy masses add depth and hand-painted highlights.
   for(let j=0;j<24;j++){
    const theta=j*2.399+a.phase,rad=15+(j%5)*12;
    const xx=Math.cos(theta)*rad,yy=-42+Math.sin(theta)*rad*.69;
    ellipse(g,xx,yy,7+(j%3)*2.5,4+(j%2)*2,j%4===0?"#a6b77b99":j%3===0?"#779e6499":"#658d5688",-.35);
   }
   // Tiny visible foliage sprigs along the silhouette.
   for(let j=0;j<9;j++){
    const theta=j*2.399+a.phase,xx=Math.cos(theta)*65,yy=-43+Math.sin(theta)*43;
    g.strokeStyle="#92a96e99";g.lineWidth=1.4;
    g.beginPath();g.moveTo(xx-5,yy+2);g.quadraticCurveTo(xx,yy-4,xx+6,yy-2);g.stroke();
   }
  }
  g.restore();g.restore();
 }
 drawFallenWood();
}
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;camX=heroine.x;camY=heroine.y-H*.1/zoom;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);windCanvas.width=canvas.width;windCanvas.height=canvas.height;counterCanvas.width=canvas.width;counterCanvas.height=canvas.height;treeCanvas.width=canvas.width;treeCanvas.height=canvas.height;trees=[];windDirty=true;render()}
canvas.addEventListener("click",e=>{
 // Until customers are implemented, tapping the merchant's counter previews a sale.
 const x=(e.clientX-W/2)/zoom+camX,y=(e.clientY-H/2)/zoom+camY;
 if(Math.abs(x)<132&&y>-85&&y<4)startMerchantSale(Math.random()>.5?"wood":"meat");
});

canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?.9:1.1),.75,1.5);windDirty=true;render()},{passive:false});
const keys={};addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;heroineTick(dt,now);const ease=1-Math.exp(-12*dt);camX+=(heroine.x-camX)*ease;camY+=(heroine.y-H*.1/zoom-camY)*ease;render();if(now-lastWindFrame>50){drawWind(now);drawTrees(now);renderForeground(now);lastWindFrame=now}requestAnimationFrame(loop)}
resize();requestAnimationFrame(loop);
