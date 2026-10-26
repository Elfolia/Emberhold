// Emberhold heroine animation asset integration.
// Include AFTER game-heroine-v40.js; all paths relative to the HTML page.
(()=>{
 const root="assets/heroine/";
 const groups={walk_side:9,walk_front:7,walk_back:7,attack:4,idle:5};
 const images={};let ready=false;
 const all=[];
 for(const [kind,count] of Object.entries(groups)){
  images[kind]=[];
  for(let i=0;i<count;i++){
   const im=new Image();im.src=root+kind+"_"+String(i).padStart(2,"0")+".png";
   images[kind].push(im);all.push(im.decode().catch(()=>null));
  }
 }
 Promise.all(all).then(()=>{ready=Object.values(images).some(a=>a.some(im=>im.naturalWidth>0));});
 const original=drawHeroine;
 drawHeroine=function(now=performance.now()){
  if(!ready){original(now);return;}
  const age=(now-heroine.attackAt)/1000;
  const attacking=age>=0&&age<.64;
  let kind,index;
  if(attacking){kind="attack";index=Math.min(3,Math.floor(age/.64*4));}
  else if(heroine.move){const vertical=Math.abs(joystick.y)>Math.abs(joystick.x)*1.25;kind=vertical?(joystick.y<0?"walk_back":"walk_front"):"walk_side";index=Math.floor(heroine.walk*5)%groups[kind];}
  else {kind="idle";index=Math.floor(now/1000*1.5)%5;}
  const im=images[kind][index];
  if(!im || !im.naturalWidth){original(now);return;}
  const g=counterCtx;
  g.save();
  g.translate(W/2+(heroine.x-camX)*zoom,H/2+(heroine.y-camY)*zoom);
  // Images face right; mirror for movement left. The feet are the stable anchor.
  g.scale(zoom*(heroine.dir<0?-1:1),zoom);
  // Keep the complete PNG visible, preserve aspect ratio, and anchor at the feet.
  const maxWidth=94,maxHeight=128;
  const scale=Math.min(maxWidth/im.naturalWidth,maxHeight/im.naturalHeight);
  const dw=im.naturalWidth*scale,dh=im.naturalHeight*scale;
  g.drawImage(im,-dw/2,-dh+8,dw,dh);
  g.restore();
 };
})();
