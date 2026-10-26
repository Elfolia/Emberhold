"use strict";
// Emberhold: clean slate. Only the existing forest floor remains.
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
let W=0,H=0,dpr=1,scale=1,camX=0,camY=0;
const state={season:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function resize(){dpr=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scale=clamp(Math.min(W/16,H/21),22,48);draw()}
function screen(x,y,z=0){return {x:W/2+(x-camX)*scale,y:H*.52+(y-camY)*scale*.67-z*scale}}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill()}
function terrainHash(x,y,k=0){let v=Math.sin(x*127.1+y*311.7+k*74.7)*43758.5453;return v-Math.floor(v)}
function terrainHeight(x,y){return Math.sin(x*.37+y*.12)*.24+Math.cos(y*.29-x*.18)*.19+Math.sin(x*.81-y*.61)*.075}
function paintWildTerrain(){
 const left=Math.floor(camX-18),right=Math.ceil(camX+18),top=Math.floor(camY-27),bottom=Math.ceil(camY+27);
 ctx.save();
 // Broad overlapping color washes make the ground visibly varied even on a small iPad screen.
 for(let x=left-2;x<=right+2;x+=5.1)for(let y=top-2;y<=bottom+2;y+=5.1){
  
  const q=screen(x,y),h=terrainHeight(x,y),n=terrainHash(Math.floor(x*4),Math.floor(y*4),6);
  ellipse(q.x,q.y,scale*(2.3+n*.8),scale*(.75+Math.abs(h)*.8),h>.13?"#b9a16c50":h<-.13?"#395d4d5c":"#56774b55");
 }
 for(let x=left;x<=right;x+=1.7)for(let y=top;y<=bottom;y+=1.7){
  
  const seed=terrainHash(Math.floor(x*10),Math.floor(y*10)),h=terrainHeight(x,y),p=screen(x,y);
  if(seed>.18){
   const colors=state.season===3?["#e4e2d5","#c5cbc2","#aeb9ad"]:state.season===2?["#a58c58","#6f8557","#c6a56a"]:["#8baa6e","#64885e","#9da77a"];
   ellipse(p.x,p.y,scale*(.48+seed*.46),scale*(.12+seed*.12),colors[Math.floor(seed*9)%3]+"7c");
  }
  if(seed>.67){ctx.strokeStyle=h>0?"#d0c09a77":"#405a4277";ctx.lineWidth=Math.max(.6,scale*.027);ctx.beginPath();ctx.ellipse(p.x,p.y,scale*(.48+seed*.23),scale*(.13+seed*.08),-.12,Math.PI*.08,Math.PI*.89);ctx.stroke()}
  if(seed>.82){let rx=p.x+scale*.28,ry=p.y-scale*.04;ellipse(rx,ry+scale*.065,scale*.22,scale*.07,"#283d2b55");poly([[rx-scale*.18,ry],[rx-scale*.1,ry-scale*.15],[rx+scale*.09,ry-scale*.18],[rx+scale*.23,ry-scale*.03],[rx+scale*.15,ry+scale*.07]],state.season===3?"#a5a9a7":"#777c6a");poly([[rx-scale*.1,ry-scale*.15],[rx+scale*.09,ry-scale*.18],[rx+scale*.02,ry-scale*.07]],"#b1b4a277")}
  if(seed>.39&&seed<.62){let gx=p.x-scale*.22,gy=p.y;ctx.strokeStyle=state.season===3?"#c2bca5":state.season===2?"#a18b4d":"#476c41";ctx.lineWidth=Math.max(1,scale*.025);for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(gx+j*scale*.1,gy);ctx.lineTo(gx+(j-1)*scale*.13,gy-scale*(.14+seed*.16));ctx.stroke()}}
  if(seed>.61&&seed<.67&&state.season!==3){let fx=p.x+scale*.2,fy=p.y-scale*.07;ctx.strokeStyle="#54714a";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-scale*.19);ctx.stroke();ellipse(fx,fy-scale*.21,scale*.055,scale*.045,state.season===2?"#e4b36d":"#e9d4a4")}
 }
 ctx.restore();
}

function draw(){
 ctx.fillStyle="#789a74";ctx.fillRect(0,0,W,H);
 const startX=Math.floor(camX-18),endX=Math.ceil(camX+18),startY=Math.floor(camY-25),endY=Math.ceil(camY+25);
 for(let x=startX;x<endX;x+=2)for(let y=startY;y<endY;y+=2){const p=screen(x,y),v=Math.abs(Math.sin(x*12.4+y*9.1));ellipse(p.x,p.y,scale*.12,scale*.045,v>.6?"#b6ad7a33":"#314d3430")}
 paintWildTerrain();
}
window.addEventListener("resize",resize);resize();
