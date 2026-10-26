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
 // Each ground object is selected from local moisture, soil and light conditions.
 // Global grid cells keep positions identical even after a tile leaves the cache.
 const CELL=15,margin=18;
 const gx0=Math.floor((tx*TILE-margin)/CELL),gx1=Math.ceil(((tx+1)*TILE+margin)/CELL);
 const gy0=Math.floor((ty*TILE-margin)/CELL),gy1=Math.ceil(((ty+1)*TILE+margin)/CELL);
 for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
  const rng=randMaker(gx,gy),wx=gx*CELL+rng()*CELL,wy=gy*CELL+rng()*CELL;
  const x=wx-tx*TILE,y=wy-ty*TILE;
  const moisture=fbm(wx/350,wy/350,12),grassiness=fbm(wx/230,wy/230,34);
  const sun=fbm(wx/670,wy/670,6),rockiness=fbm(wx/460,wy/460,46);
  const soil=Math.max(0,Math.min(1,(.49-grassiness)*4));
  const mud=Math.max(0,Math.min(1,(moisture-.54)*4))*soil;
  const lush=(1-soil)*Math.max(.2,moisture);
  const choice=rng();
  // Mud appears only on wet, exposed soil, with tiny reflective wet highlights.
  if(mud>.23&&choice<mud*.65){
   oval(g,x,y,4+rng()*9,1.7+rng()*4,"#423d2b85");
   if(rng()<.6)oval(g,x-1,y-1,1+rng()*4,.5+rng(),"#b7aa7999");
  }else if(rockiness>.54&&choice<.11){
   const radius=2+rng()*4;
   oval(g,x+1,y+1,radius*1.15,radius*.65,"#172b1c66");
   oval(g,x,y,radius,radius*.56,"#777a638e");
   oval(g,x-1,y-1,radius*.53,radius*.22,"#c8c2a0b8");
  }else if(soil>.58&&choice<.55){
   // Fine leaf litter and grit on drier exposed ground.
   g.save();g.translate(x,y);g.rotate(rng()*Math.PI);
   oval(g,0,0,1.5+rng()*3,.5+rng()*1.3,rng()<.5?"#c09b638f":"#61492f99");g.restore();
  }else if(lush>.32&&sun>.41&&choice<.042){
   // Flowers grow in sunlit, grassy places; petals and center are separate shapes.
   const radius=2+rng()*2.2;
   const col=["#f7e9bf","#fff8e7","#efbd9c","#e7cf72"][Math.floor(rng()*4)];
   g.strokeStyle="#365e35";g.lineWidth=.85;g.beginPath();g.moveTo(x,y+3);g.lineTo(x,y);g.stroke();
   for(let k=0;k<5;k++){const angle=k*Math.PI*2/5;oval(g,x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,radius*.66,radius*.55,col)}
   oval(g,x,y,1.1,1.1,"#b88a37");
  }else if(lush>.24&&choice<.82){
   // Clumps of crisp individual grass blades; more in damp grasslands.
   const blades=2+Math.floor(rng()*5);
   for(let k=0;k<blades;k++){
    const bx=x+(rng()-.5)*7,by=y+(rng()-.5)*3,h=3+rng()*8;
    g.strokeStyle=rng()<.42?"#c4cb7dc2":rng()<.5?"#2d542dca":"#739d4dcc";
    g.lineWidth=.65+rng()*.7;g.beginPath();g.moveTo(bx,by);g.quadraticCurveTo(bx+(rng()-.5)*4,by-h*.55,bx+(rng()-.5)*7,by-h);g.stroke();
   }
  }else if(lush>.48&&choice<.92){
   // Small moss cushions with highlights and self-shadow.
   oval(g,x,y+1,4+rng()*4,2+rng()*2,"#254a2e88");
   for(let k=0;k<5;k++)oval(g,x+(rng()-.5)*8,y+(rng()-.5)*5,1+rng()*2,.8+rng()*1.5,"#9db76e99");
  }
 }
 return c;
}
function tile(tx,ty){const key=tx+","+ty;if(cache.has(key)){const c=cache.get(key);cache.delete(key);cache.set(key,c);return c}const c=makeTile(tx,ty);cache.set(key,c);if(cache.size>MAX_TILES)cache.delete(cache.keys().next().value);return c}
// The approved illustration supplies a color palette, not repeated picture fragments.
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
