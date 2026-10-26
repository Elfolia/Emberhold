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
// Extract representative grass, moss and soil colors from the user's illustration.
// The original image is NEVER cut up, rotated, or used as a repeating map.
let palette={grass:[[49,85,39],[80,119,51],[115,144,66]],soil:[[99,75,48],[141,104,63],[181,139,84]],dark:[[34,63,31],[54,79,37]],stone:[[98,100,79],[146,139,104]]};
function learnPalette(){
 const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");
 g.drawImage(paintedGround,0,0,128,128);
 const p=g.getImageData(0,0,128,128).data,groups={grass:[],soil:[],dark:[],stone:[]};
 for(let i=0;i<p.length;i+=16){const r=p[i],gr=p[i+1],b=p[i+2],bright=(r+gr+b)/3;
  if(gr>r*1.07&&gr>b*1.1){(bright<68?groups.dark:groups.grass).push([r,gr,b])}
  else if(r>gr*1.12&&gr>b*.95)groups.soil.push([r,gr,b]);
  else if(Math.abs(r-gr)<24&&Math.abs(gr-b)<40)groups.stone.push([r,gr,b]);
 }
 for(const key of Object.keys(groups)){
  const arr=groups[key];if(arr.length<12)continue;
  arr.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
  palette[key]=[.18,.5,.82].map(t=>{const n=Math.floor(t*(arr.length-1)),radius=Math.max(2,Math.floor(arr.length*.025));let rgb=[0,0,0],count=0;
   for(let j=Math.max(0,n-radius);j<=Math.min(arr.length-1,n+radius);j++){for(let k=0;k<3;k++)rgb[k]+=arr[j][k];count++}
   return rgb.map(v=>Math.round(v/count));});
 }
}
function makeTile(tx,ty){
 const c=document.createElement("canvas");c.width=c.height=TILE;const g=c.getContext("2d"),im=g.createImageData(TILE,TILE),p=im.data;
 const rgb=(a,b,t)=>[a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t];
 // Biome proportions evolve slowly across thousands of world pixels.
 // Percentage thresholds form coherent regions, not isolated random fragments.
 for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
  const wx=tx*TILE+x,wy=ty*TILE+y;
  const region=fbm(wx/1900,wy/1900,2),meadow=fbm(wx/670,wy/670,6);
  const moisture=fbm(wx/350,wy/350,12),micro=fbm(wx/66,wy/66,21);
  const grassiness=fbm(wx/230,wy/230,34);
  const soilShare=Math.max(0,Math.min(1,(.48-grassiness)*4+(meadow<.36?.16:0)));
  const mossShare=Math.max(0,Math.min(1,(moisture-.52)*3+(region<.42?.17:0)));
  const shade=Math.max(0,Math.min(1,(region-.37)*1.6));
  const cGrass=rgb(palette.grass[0],palette.grass[2],Math.max(0,Math.min(1,micro*.65+shade*.35)));
  const cMoss=rgb(palette.dark[0],palette.grass[1],Math.max(0,Math.min(1,moisture*.9)));
  const cEarth=rgb(palette.soil[0],palette.soil[2],Math.max(0,Math.min(1,micro*.8+meadow*.2)));
  const vegetation=rgb(cGrass,cMoss,mossShare*.83);
  const color=rgb(vegetation,cEarth,soilShare*.87);
  const grain=(hash(wx,wy,75)-.5)*18+(noise(wx/12,wy/12,81)-.5)*17;
  const i=(y*TILE+x)*4;
  p[i]=Math.max(0,Math.min(255,color[0]+grain));p[i+1]=Math.max(0,Math.min(255,color[1]+grain));p[i+2]=Math.max(0,Math.min(255,color[2]+grain*.8));p[i+3]=255;
 }
 g.putImageData(im,0,0);
 // Stable fine-scale vegetation, leaf litter, pebbles and flowers.
 const rng=randMaker(tx,ty);
 for(let i=0;i<1650;i++){
  const x=rng()*TILE,y=rng()*TILE,wx=tx*TILE+x,wy=ty*TILE+y;
  const soil=fbm(wx/230,wy/230,34)<.45,kind=rng();
  if(kind<.57&&!soil){
   g.strokeStyle=rng()>.5?"#b5c879ad":"#1e4129aa";g.lineWidth=.6+rng()*1.1;
   g.beginPath();g.moveTo(x,y);g.lineTo(x+(rng()-.5)*4,y-2-rng()*5);g.stroke();
  }else if(kind<.78){oval(g,x,y,1+rng()*3,.5+rng()*1.5,soil?"#76543a88":"#c2b46a80")}
  else if(kind<.9){oval(g,x,y,1+rng()*3,1+rng()*2,"#5b665088");oval(g,x-1,y-1,1+rng()*2,.8+rng(),"#c3bb9caa")}
  else if(kind<.95&&!soil){const col=["#f2e7c0","#f0d27b","#e8ac8f","#fff5df"][Math.floor(rng()*4)];for(let a=0;a<5;a++){const ang=a*Math.PI*2/5;oval(g,x+Math.cos(ang)*2.4,y+Math.sin(ang)*2.4,1.3,1.1,col)}oval(g,x,y,1,1,"#d0a149")}
  else if(!soil){oval(g,x,y,4+rng()*6,2+rng()*3,"#183d2855");for(let j=0;j<5;j++)oval(g,x+(rng()-.5)*10,y+(rng()-.5)*6,1+rng()*2,1+rng()*2,"#94b45a88")}
 }
 return c;
}
function tile(tx,ty){const key=tx+","+ty;if(cache.has(key)){const c=cache.get(key);cache.delete(key);cache.set(key,c);return c}const c=makeTile(tx,ty);cache.set(key,c);if(cache.size>MAX_TILES)cache.delete(cache.keys().next().value);return c}
// The approved illustrated forest-floor artwork is the actual terrain texture.
// Keep it locked to world coordinates; never randomize or repaint it per frame.
const paintedGround=new Image();let paintedGroundReady=false;
paintedGround.onload=()=>{paintedGroundReady=true;learnPalette();cache.clear();render()};
paintedGround.onerror=()=>{paintedGroundReady=false;render()};
paintedGround.src="./assets/emberhold-waldboden.webp?v=1";
function render(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#527c4c";ctx.fillRect(0,0,W,H);
 const ox=Math.round(W/2-camX*zoom),oy=Math.round(H/2-camY*zoom);
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
