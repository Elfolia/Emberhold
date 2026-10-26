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
function counterZone(x,y){return x>-335&&x<335&&y>-355&&y<215}
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
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom,zoom);
 const poly=(a,c,e="#473325",w=2)=>{g.beginPath();g.moveTo(...a[0]);for(let i=1;i<a.length;i++)g.lineTo(...a[i]);g.closePath();g.fillStyle=c;g.fill();if(e){g.strokeStyle=e;g.lineWidth=w;g.stroke()}};
 const line=(a,b,c,w=2)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=c;g.lineWidth=w;g.stroke()};
 // One welcoming, solid merchant counter: an open standing area BEHIND it.
 // Not a U-shaped crib. Customer approaches from the gate.
 ellipse(g,0,39,91,20,"#25302366");
 // Back of the counter, supporting timber and shelves.
 poly([[-92,-7],[92,-7],[92,43],[-92,43]],"#70492e","#3c2d22",3);
 for(let x=-76;x<86;x+=30){
  poly([[x,4],[x+25,4],[x+25,35],[x,35]],"#865b38","#4b3425",1.7);
  line([x+4,9],[x+21,9],"#bd9461",1.3);
 }
 // Thick sculpted wooden countertop, sloped subtly toward the player.
 poly([[-103,-17],[101,-17],[111,1],[-111,1]],"#c69b62","#543a28",3);
 poly([[-103,-17],[-92,-25],[90,-25],[101,-17]],"#e0b37a","#63432e",2);
 line([-100,-15],[99,-15],"#f1d09a",2);
 for(let x=-75;x<90;x+=37)line([x,-8],[x+15,-7],"#94663d88",1.2);
 // Handcrafted corners and stout legs, grounded in the fort.
 poly([[-94,38],[-78,38],[-79,59],[-93,59]],"#4f3728");
 poly([[77,38],[92,38],[93,59],[79,59]],"#4f3728");
 // Brass drawer pulls and a tiny carved leaf, not a large flat sign.
 for(let x=-65;x<=67;x+=30)ellipse(g,x,20,3,1.6,"#d7ae69");
 ellipse(g,0,43,15,4,"#4c613e");
 g.fillStyle="#e8d3a1";g.font="italic 10px Georgia,serif";g.textAlign="center";g.fillText("Emberhold",0,46);
 g.restore();
}
function drawMerchant(){
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom,zoom);
 // Standing on the interior floor behind the counter, not a disembodied head.
 ellipse(g,1,-13,17,6,"#2d332660");
 for(const x of [-8,8]){g.fillStyle="#49382d";g.fillRect(x-5,-25,10,19);ellipse(g,x,-6,7,4,"#3e332b")}
 g.fillStyle="#526e4c";g.beginPath();g.moveTo(-18,-63);g.lineTo(18,-63);g.lineTo(16,-24);g.lineTo(-16,-24);g.closePath();g.fill();
 g.fillStyle="#a77c51";g.beginPath();g.moveTo(-10,-52);g.lineTo(10,-52);g.lineTo(12,-25);g.lineTo(-12,-25);g.closePath();g.fill();
 g.strokeStyle="#d2ac7b";g.lineWidth=2;g.beginPath();g.moveTo(-8,-54);g.lineTo(-7,-30);g.moveTo(8,-54);g.lineTo(7,-30);g.stroke();
 g.strokeStyle="#526e4c";g.lineWidth=10;g.lineCap="round";g.beginPath();g.moveTo(-15,-60);g.lineTo(-22,-42);g.moveTo(15,-60);g.lineTo(23,-42);g.stroke();
 ellipse(g,-22,-42,5,5,"#d5a079");ellipse(g,23,-42,5,5,"#d5a079");
 ellipse(g,0,-79,17,21,"#d5a079");
 g.fillStyle="#62422f";g.beginPath();g.moveTo(-17,-82);g.quadraticCurveTo(-20,-105,0,-105);g.quadraticCurveTo(23,-103,17,-81);g.lineTo(11,-94);g.quadraticCurveTo(-5,-87,-15,-85);g.closePath();g.fill();
 ellipse(g,-6,-79,1.5,2,"#40342c");ellipse(g,6,-79,1.5,2,"#40342c");
 g.strokeStyle="#985e51";g.lineWidth=1.4;g.beginPath();g.arc(0,-75,4,.2,2.9);g.stroke();
 g.restore();
}
function drawFort(){
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom*1.65,zoom*1.65);
 const poly=(a,c,e="#493626",w=2)=>{g.beginPath();g.moveTo(...a[0]);for(let i=1;i<a.length;i++)g.lineTo(...a[i]);g.closePath();g.fillStyle=c;g.fill();if(e){g.strokeStyle=e;g.lineWidth=w;g.stroke()}};
 const line=(a,b,c,w=2)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=c;g.lineWidth=w;g.stroke()};
 // Entire enclosed fort footprint, with the ground level matching the forest.
 ellipse(g,0,0,205,161,"#26382155");
 poly([[-174,-115],[174,-115],[189,118],[-189,118]],"#8b79535c",null);
 for(let i=0;i<18;i++){const x=(hash(i,9,18)-.5)*300,y=(hash(i,7,22)-.5)*190;ellipse(g,x,y,3,1.5,"#c4ac7977")}
 // Rear palisade.
 function stake(x,y,h=68){
  poly([[x-6,y],[x+6,y],[x+6,y-h],[x,y-h-13],[x-6,y-h]],hash(Math.round(x),Math.round(y),8)>.5?"#957047":"#775537","#483525",1.5);
  line([x-2,y-7],[x-2,y-h+3],"#d2a77588",1.4);
 }
 for(let x=-174;x<=174;x+=12)stake(x,-113,73);
 line([-173,-154],[173,-154],"#4d3727",7);
 // Both SIDE walls connect back to the front, closing the perimeter.
 for(let i=0;i<=17;i++){
  const t=i/17,y=-113+t*232;
  stake(-174-11*t,y,66-t*8);
  stake(174+11*t,y,66-t*8);
 }
 // Rear corner towers.
 for(const x of [-173,173]){
  poly([[x-23,-119],[x+23,-119],[x+21,-174],[x-21,-174]],"#79563b","#463325",2.5);
  for(let j=-14;j<=16;j+=10)line([x+j,-169],[x+j,-126],"#bb9063",2);
  poly([[x-34,-169],[x,-204],[x+34,-169],[x+25,-162],[x,-190],[x-25,-162]],"#59764e","#324c38",2.5);
  poly([[x-34,-169],[x,-204],[x-5,-181],[x-25,-162]],"#899e68","#3e5b41",1);
 }
 g.restore();
}
function drawFortGate(){
 const g=counterCtx;g.save();g.translate(W/2-camX*zoom,H/2-camY*zoom);g.scale(zoom*1.65,zoom*1.65);
 const poly=(a,c,e="#493525",w=2)=>{g.beginPath();g.moveTo(...a[0]);for(let i=1;i<a.length;i++)g.lineTo(...a[i]);g.closePath();g.fillStyle=c;g.fill();if(e){g.strokeStyle=e;g.lineWidth=w;g.stroke()}};
 const line=(a,b,c,w=2)=>{g.beginPath();g.moveTo(...a);g.lineTo(...b);g.strokeStyle=c;g.lineWidth=w;g.stroke()};
 // Continuous FRONT palisade, interrupted ONLY by the proper walk-through gate.
 for(let x=-182;x<=-49;x+=12) {
  const y=119;poly([[x-6,y],[x+6,y],[x+6,y-63],[x,y-77],[x-6,y-63]],"#8b6642","#483525",1.5);
  line([x-2,y-7],[x-2,y-58],"#c7a07599",1.2);
 }
 for(let x=49;x<=182;x+=12){
  const y=119;poly([[x-6,y],[x+6,y],[x+6,y-63],[x,y-77],[x-6,y-63]],"#8b6642","#483525",1.5);
  line([x-2,y-7],[x-2,y-58],"#c7a07599",1.2);
 }
 // Gate posts and overhead beam. Opening remains visually clear for passage.
 for(const x of [-49,49]){
  poly([[x-11,124],[x+11,124],[x+11,31],[x-11,31]],"#66452e","#392a21",3);
  line([x-5,39],[x-5,116],"#bb8f60",2.5);
  poly([[x-16,31],[x,8],[x+16,31]],"#546d4c","#344936",2);
 }
 poly([[-61,30],[61,30],[61,44],[-61,44]],"#715035","#3d2d24",3);
 line([-58,33],[58,33],"#d2aa76",2);
 // Two visibly hinged OPEN gate leaves, folded back to the side walls.
 poly([[-47,61],[-30,72],[-32,117],[-47,118]],"#98724b","#513b29",2);
 poly([[47,61],[30,72],[32,117],[47,118]],"#98724b","#513b29",2);
 for(const x of [-41,41]){ellipse(g,x,84,2,3,"#d8b775");ellipse(g,x,103,2,3,"#d8b775")}
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
 drawFortGate();
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
