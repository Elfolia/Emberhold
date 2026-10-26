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
function counterZone(x,y){return x>-225&&x<225&&y>-185&&y<150}
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
 const g=counterCtx;
 g.setTransform(dpr,0,0,dpr,0,0);
 g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom*.58,zoom*.58);g.translate(0,-12);
 const path=(pts,fill,stroke,width=1)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}};
 const line=(pts,color,width)=>{g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.lineWidth=width;g.strokeStyle=color;g.lineCap="round";g.stroke()};
 // An inviting rustic forest trading counter, not a box-shaped kiosk.
 // Keep the open inner floor accessible from the back.
 ellipse(g,0,25,150,95,"#192b1c4b");
 path([[-116,-79],[111,-79],[138,70],[-137,70]],"#624b32","#473727",3);
 path([[-109,-76],[105,-76],[128,63],[-128,63]],"#a78558","#d1af7b",1.5);
 for(let i=0;i<8;i++){
  const y=-68+i*18;line([[-112+i*.7,y],[111+i*1.8,y]],"#6c523a88",1.8);
  line([[-103+i*.4,y+3],[99+i*1.4,y+3]],"#d5b27a66",1);
 }
 // Curved wooden side cabinetry, with an unobstructed workspace between.
 path([[-142,-60],[-112,-70],[-101,37],[-135,51]],"#6b442d","#392b23",3);
 path([[111,-70],[140,-61],[137,52],[103,37]],"#6b442d","#392b23",3);
 for(const side of [-1,1]){
  g.save();g.scale(side,1);
  for(let i=0;i<4;i++){
   const y=-45+i*23;
   line([[119,y],[127,y+3],[128,y+14]],"#a17a4f",2);
   line([[120,y+5],[123,y+6]],"#e4bd7d88",1);
  }
  g.restore();
 }
 // Deep carved front: soft bowed silhouette, warm highlights and hand-shaped beams.
 g.beginPath();g.moveTo(-140,42);g.quadraticCurveTo(0,51,140,42);g.lineTo(145,80);
 g.quadraticCurveTo(0,93,-145,80);g.closePath();g.fillStyle="#67442c";g.fill();
 g.strokeStyle="#39291e";g.lineWidth=3;g.stroke();
 for(let i=-4;i<=4;i++){
  const x=i*28;
  line([[x,57],[x-2,77]],"#422e22a8",2);
  line([[x+5,59],[x+4,75]],"#b78a54aa",1.2);
 }
 // Distinctive scalloped wood apron with little carved leaf motifs.
 for(let i=-4;i<=4;i++){
  const x=i*29;
  ellipse(g,x,68,7,3.5,"#9c7144");
  line([[x-4,68],[x+3,68]],"#dfb77d",1);
 }
 // Curving solid-wood counter surface, subtle grain and brighter bevel.
 g.beginPath();g.moveTo(-149,36);g.quadraticCurveTo(0,46,149,36);
 g.quadraticCurveTo(157,41,153,53);g.quadraticCurveTo(0,66,-153,53);
 g.quadraticCurveTo(-157,42,-149,36);g.closePath();
 g.fillStyle="#bc8c57";g.fill();g.strokeStyle="#4c3424";g.lineWidth=2.5;g.stroke();
 g.beginPath();g.moveTo(-147,40);g.quadraticCurveTo(0,50,147,40);
 g.strokeStyle="#f0ca8d";g.lineWidth=2;g.stroke();
 // Narrower side tops preserve the visibly walkable open center.
 path([[-149,35],[-116,31],[-109,-72],[-137,-66]],"#bc8e59","#513a2a",2.5);
 path([[115,31],[149,35],[138,-66],[109,-72]],"#bc8e59","#513a2a",2.5);
 line([[-140,-62],[-145,31]],"#ebc38a",1.8);
 line([[135,-62],[145,31]],"#ebc38a",1.8);
 for(let i=0;i<5;i++){
  const y=-52+i*17;
  line([[-134,y],[-127,y+3]],"#79583a99",1.2);
  line([[126,y],[135,y+2]],"#79583a99",1.2);
 }
 // Small understated woodland engraving, rather than a large flat sign.
 g.fillStyle="#e3c591";g.font="italic 12px Georgia,serif";g.textAlign="center";
 g.fillText("Emberhold",0,79);
 // Tiny leafy carvings at the corners, part of the furniture itself.
 for(const side of [-1,1]){
  g.save();g.translate(side*125,62);g.scale(side,1);
  line([[0,13],[4,0]],"#405638",2);
  ellipse(g,1,3,5,2.5,"#66834a",-.6);
  ellipse(g,5,9,5,2.5,"#8b9f60",.5);
  g.restore();
 }
 g.restore();
}
// Timber forest fort north of the trading counter. The courtyard is open and walkable.

// The first inhabitant of Emberhold: the merchant already keeps the fort's stall open.
function drawMerchant(){
 const g=counterCtx;
 g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom*.58,zoom*.58);g.translate(0,-12);
 // Positioned behind the counter, with the front apron naturally hiding the lower body.
 ellipse(g,1,-31,25,9,"#332b2566");
 // Sleeves, warm green tunic, and leather apron.
 g.fillStyle="#4a6949";g.beginPath();g.moveTo(-24,-68);g.quadraticCurveTo(-32,-56,-28,-30);
 g.lineTo(28,-30);g.quadraticCurveTo(30,-56,23,-68);g.closePath();g.fill();
 g.fillStyle="#8c603f";g.beginPath();g.moveTo(-13,-57);g.lineTo(14,-57);g.lineTo(17,-30);g.lineTo(-17,-30);g.closePath();g.fill();
 g.strokeStyle="#d1ae7c";g.lineWidth=2;g.beginPath();g.moveTo(-9,-55);g.lineTo(-7,-35);g.moveTo(9,-55);g.lineTo(7,-35);g.stroke();
 // Neck and face.
 ellipse(g,0,-76,10,10,"#c58e67");
 ellipse(g,0,-95,20,24,"#d7a67e");
 // Soft wavy hair and a little side braid.
 g.fillStyle="#513a2b";g.beginPath();g.moveTo(-20,-95);g.quadraticCurveTo(-23,-125,1,-122);
 g.quadraticCurveTo(27,-123,20,-94);g.lineTo(15,-109);g.quadraticCurveTo(-2,-104,-17,-99);g.closePath();g.fill();
 g.strokeStyle="#64462e";g.lineWidth=6;g.beginPath();g.moveTo(18,-107);g.quadraticCurveTo(27,-88,19,-69);g.stroke();
 // Expressive eyes and a welcoming smile.
 ellipse(g,-7,-94,1.7,2,"#3d392d");ellipse(g,7,-94,1.7,2,"#3d392d");
 g.strokeStyle="#8b5348";g.lineWidth=1.7;g.beginPath();g.arc(0,-88,5,.16,Math.PI-.16);g.stroke();
 // An arm rests on the counter, suggesting the seller is ready to trade.
 g.strokeStyle="#4a6949";g.lineWidth=10;g.lineCap="round";
 g.beginPath();g.moveTo(-23,-61);g.quadraticCurveTo(-29,-46,-17,-41);g.stroke();
 ellipse(g,-17,-41,5,4,"#d7a67e");
 // Tiny stitched brooch.
 ellipse(g,0,-64,3,3,"#e7c47e");
 g.restore();
}
function drawFort(){
 const g=counterCtx;
 g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom,zoom);
 // The fort and the counter share one site in world coordinates.
 const poly=(p,fill,edge,w=1)=>{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();g.fillStyle=fill;g.fill();if(edge){g.lineWidth=w;g.strokeStyle=edge;g.stroke()}};
 const line=(p,c,w=1)=>{g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.lineWidth=w;g.strokeStyle=c;g.lineCap="round";g.stroke()};
 // Soft foundation, warm earth and an open inner courtyard.
 ellipse(g,7,28,218,160,"#142a1b66");
 poly([[-178,-99],[151,-99],[190,99],[-184,99]],"#766243","#423c2d",4);
 poly([[-166,-91],[141,-91],[175,86],[-172,86]],"#a28b60","#cfb582",2);
 for(let i=0;i<12;i++){const y=-84+i*14;line([[-160,y],[149+i*1.7,y]],i%2?"#8a744e77":"#c9ab7777",1.5)}
 // Rear timber palisade, raised above the courtyard with staggered stakes.
 for(let i=0;i<28;i++){
  const x=-179+i*12.3,y=-102+(i/27)*2;
  poly([[x,y],[x+12,y],[x+12,y-81],[x+6,y-96],[x,y-81]],i%3===0?"#785537":i%3===1?"#98734a":"#886440","#473624",1.6);
  line([[x+3,y-78],[x+3,y-8]],"#c29a62a0",1.3);
 }
 line([[-176,-140],[163,-138]],"#4e3a28",8);
 line([[-176,-128],[163,-126]],"#c6a070",2);
 // Side palisades taper toward the viewer for a coherent three-quarter view.
 for(const side of [-1,1]){
  for(let i=0;i<13;i++){
   const t=i/12,outer=side*(178+8*t),inner=side*(165+8*t),y=-100+t*177;
   poly([[inner,y],[outer,y-2],[outer,y-75+t*18],[side*(173+8*t),y-87+t*17],[inner,y-75+t*18]],i%3===0?"#715032":"#98704a","#493523",1.7);
   line([[side*(171+8*t),y-69+t*18],[side*(171+8*t),y-8]],"#d0a87888",1.1);
  }
 }
 // Watchtowers: grounded stone footings, timber walls, and pitched mossy roofs.
 function tower(x,y){
  ellipse(g,x+5,y+9,41,19,"#1d291d66");
  poly([[x-29,y-4],[x+28,y-4],[x+25,y-81],[x-27,y-81]],"#805b3b","#403024",3);
  for(let i=-20;i<28;i+=11)line([[x+i,y-73],[x+i,y-12]],"#bd9360",2);
  poly([[x-39,y-79],[x+37,y-79],[x+27,y-109],[x-27,y-109]],"#4e6141","#293d31",3);
  poly([[x-27,y-109],[x,y-136],[x+27,y-109]],"#657b4c","#2c4232",3);
  poly([[x-39,y-79],[x-27,y-109],[x,y-136],[x-7,y-100]],"#83915d","#344833",2);
  line([[x-29,y-84],[x+28,y-84]],"#c2ac7a",3);
  ellipse(g,x-16,y-99,7,3,"#9eae72");
 }
 tower(-170,-88);tower(161,-88);
 // Front is open: two gate posts and an arch, no impassable front wall.
 for(const x of [-58,58]){
  poly([[x-10,80],[x+10,80],[x+10,8],[x-10,8]],"#795235","#3f3024",2.5);
  line([[x-5,16],[x-5,70]],"#c49b65",2);
  ellipse(g,x,83,16,7,"#443d2f");
 }
 g.beginPath();g.moveTo(-58,12);g.quadraticCurveTo(0,-45,58,12);
 g.strokeStyle="#503722";g.lineWidth=13;g.stroke();
 g.beginPath();g.moveTo(-58,10);g.quadraticCurveTo(0,-46,58,10);
 g.strokeStyle="#bb9462";g.lineWidth=7;g.stroke();
 // Banner above the gate.
 poly([[-26,-21],[26,-21],[25,11],[0,27],[-25,11]],"#496747","#d0ae77",2);
 line([[-20,-13],[20,-13]],"#a4bc7b",1);
 g.fillStyle="#e5d5a4";g.font="bold 11px Georgia,serif";g.textAlign="center";g.fillText("FORT",0,3);
 // Short path extends from the entrance but leaves existing ground untouched.
 poly([[-44,92],[44,92],[56,132],[-57,132]],"#8c7450a0",null);
 g.restore();
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
 counterCtx.setTransform(1,0,0,1,0,0);
 counterCtx.clearRect(0,0,counterCanvas.width,counterCanvas.height);
 counterCtx.setTransform(dpr,0,0,dpr,0,0);
 drawFort();
 drawMerchant();
 drawCounter();
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
function rebuildTrees(){
 trees=[];treeAnchorX=camX;treeAnchorY=camY;
 const step=190,margin=330;
 const left=camX-W/(2*zoom)-margin,right=camX+W/(2*zoom)+margin;
 const top=camY-H/(2*zoom)-margin,bottom=camY+H/(2*zoom)+margin;
 for(let gy=Math.floor(top/step);gy<=Math.ceil(bottom/step);gy++)
 for(let gx=Math.floor(left/step);gx<=Math.ceil(right/step);gx++){
  const r=rngAt(gx,gy,7321),x=(gx+.17+r()*.66)*step,y=(gy+.17+r()*.66)*step;
  const f=landscape(x,y);
  if(Math.abs(x)<290&&Math.abs(y)<225)continue;
  if(f.soil>.57||f.mud>.48||r()>.75)continue;
  const size=.76+r()*.55,kind=r()>.38?"broad":"fir";
  trees.push({x,y,size,kind,phase:r()*6.283,shade:r(),lean:(r()-.5)*.7});
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
   const colors=["#284c37","#376344","#4d7950","#65895b"];
   for(let layer=0;layer<4;layer++){
    const yy=16-layer*29,w=66-layer*12;
    g.fillStyle=colors[(layer+(a.shade>.5?1:0))%colors.length];
    g.beginPath();g.moveTo(0,yy-78);g.quadraticCurveTo(-w*.35,yy-18,-w,yy+15);
    g.quadraticCurveTo(0,yy+6,w,yy+15);g.quadraticCurveTo(w*.38,yy-19,0,yy-78);g.fill();
    g.strokeStyle="#9bb16d88";g.lineWidth=1.6;g.beginPath();g.moveTo(-w*.63,yy+4);g.quadraticCurveTo(0,yy-5,w*.48,yy+3);g.stroke();
   }
  }else{
   const leaves=["#315e3c","#47754a","#5e8852","#75985e","#8aa568"];
   for(const [dx,dy,rx,ry,c] of [[-49,-28,45,38,0],[41,-31,47,39,1],[-13,-58,58,43,2],[11,-17,65,38,0],[-28,-81,34,26,3],[38,-65,35,28,2]]){
    ellipse(g,dx,dy,rx,ry,leaves[(c+(a.shade>.6?1:0))%leaves.length]);
   }
   for(let j=0;j<18;j++){
    const theta=j*2.399+a.phase,rad=16+(j%4)*13;
    ellipse(g,Math.cos(theta)*rad, -39+Math.sin(theta)*rad*.65,6+(j%3)*2,3.5,"#a3b67688",-.3);
   }
  }
  g.restore();g.restore();
 }
}
function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);windCanvas.width=canvas.width;windCanvas.height=canvas.height;counterCanvas.width=canvas.width;counterCanvas.height=canvas.height;treeCanvas.width=canvas.width;treeCanvas.height=canvas.height;trees=[];windDirty=true;render()}
canvas.addEventListener("pointerdown",e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;camX-=(e.clientX-drag.x)/zoom;camY-=(e.clientY-drag.y)/zoom;drag.x=e.clientX;drag.y=e.clientY;render()});
canvas.addEventListener("pointerup",()=>drag=null);canvas.addEventListener("pointercancel",()=>drag=null);
canvas.addEventListener("wheel",e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?.9:1.1),.75,1.5);windDirty=true;render()},{passive:false});
const keys={};addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
let last=performance.now();function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;const v=300*dt/zoom;let moved=false;
 if(keys.a||keys.arrowleft){camX-=v;moved=true}if(keys.d||keys.arrowright){camX+=v;moved=true}if(keys.w||keys.arrowup){camY-=v;moved=true}if(keys.s||keys.arrowdown){camY+=v;moved=true}
 if(moved){render()}if(now-lastWindFrame>50){drawWind(now);drawTrees(now);lastWindFrame=now}requestAnimationFrame(loop)}
resize();requestAnimationFrame(loop);
