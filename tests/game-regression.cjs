// Run with: node tests/game-regression.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const element=()=>({style:{},getContext:()=>context,addEventListener(){},setAttribute(){},appendChild(){}});
class Image {
 constructor(){this.complete=true;this.naturalWidth=180;this.naturalHeight=248;}
 set src(value){assert.ok(fs.existsSync(value),'Missing sprite: '+value);this._src=value;}
 get src(){return this._src;}
}
const sandbox={console,assert,Image,document:{getElementById:element,createElement:element,body:{appendChild(){}},hidden:false},window:{addEventListener(){}},addEventListener(){},requestAnimationFrame(){},performance:{now:()=>1000},innerWidth:390,innerHeight:844,devicePixelRatio:2};
const source=fs.readFileSync('game-heroine-v54.js','utf8');
assert.match(fs.readFileSync('index.html','utf8'),/game-heroine-v54\.js/);
vm.runInNewContext(source+`
// Full frame stays in the viewport at rest, also in landscape and on tablets.
for(const [width,height] of [[390,844],[844,390],[1024,1366]]){
 W=width;H=height;
 for(const z of [.75,1,1.5]){
 zoom=z;camX=heroine.x;camY=heroine.y-H*.22/zoom;drawHeroine(1000);
 const h=parseFloat(heroineElement.style.height),w=parseFloat(heroineElement.style.width);
 const x=parseFloat(heroineElement.style.left),y=parseFloat(heroineElement.style.top);
 assert.ok(y-h>=-0.01&&y<=H);assert.ok(x-w/2>=0&&x+w/2<=W);
 assert.ok(Math.abs(w/h-180/248)<.001);
 }
}
// Comparable visible heights at zoom 1, plus safety while camera lags far behind.
W=390;H=844;zoom=1;camX=heroine.x;camY=heroine.y-H*.1;
drawHeroine(1000);
assert.ok(Math.abs(parseFloat(heroineElement.style.height)*178/248-140*213/245)<5);
camY=heroine.y+1000;drawHeroine(1000);
assert.ok(parseFloat(heroineElement.style.top)-parseFloat(heroineElement.style.height)>=64);
heroine.x=1000;heroine.y=1000;trees=[];joystick.x=1;
heroineTick(.05,1000);assert.equal(heroine.x,1003);joystick.x=0;heroine.move=false;
drawHeroine(0);const first=heroineElement.src;drawHeroine(240);assert.notEqual(heroineElement.src,first);
// Solid counter edges, fence sides, rear and front; open central gate.
for(const point of [[0,-40],[128,-40],[-128,-40],[340,0],[-340,0],[0,-225],[200,230],[-200,230],[94,230],[-94,230]])assert.ok(blockedAt(...point));
for(const y of [150,200,230,270])assert.equal(blockedAt(0,y),false);
heroine.x=0;heroine.y=140;joystick.y=-1;
for(let i=0;i<100;i++)heroineTick(.05,1000);
assert.ok(heroine.y>=18);joystick.y=0;
// Walk from outside through the gate and around either end to behind the counter.
function walkTo(x,y){
 const dx=x-heroine.x,dy=y-heroine.y,steps=Math.ceil(Math.hypot(dx,dy)/3);
 joystick.x=dx/Math.hypot(dx,dy);joystick.y=dy/Math.hypot(dx,dy);
 for(let i=0;i<steps;i++)heroineTick(.05,1000);
 assert.ok(Math.hypot(heroine.x-x,heroine.y-y)<4,'Blocked route to '+x+','+y);
 joystick.x=joystick.y=0;
}
for(const side of [-1,1]){
 heroine.x=0;heroine.y=300;
 walkTo(0,150);walkTo(side*170,150);walkTo(side*170,-125);walkTo(0,-125);
}
// Unbounded inventory, collection exactly once, complete deposit exactly once.
heroine.x=1000;heroine.y=1000;trees=[];woodCarried=1000000;
fallenWood.push({x:1000,y:1000,taken:false});heroineTick(0,1000);heroineTick(0,1000);
assert.equal(woodCarried,1000003);assert.match(woodHud.textContent,/1.000.003/);
heroine.x=0;heroine.y=50;heroineTick(0,1000);heroineTick(0,1000);
assert.equal(woodCarried,0);assert.equal(woodStored,1000003);drawWoodStorage();
// A missed impact interval still applies one chop, and prior chops survive tree rebuilds.
const tree={x:1000,y:1000};heroine.x=1000;heroine.y=1000;heroine.attackAt=1000;
treeChops.set('1000.0:1000.0',2);lastAutoTarget={kind:'tree',obj:tree};
heroineTick(0,1400);assert.ok(gatheredTrees.has('1000.0:1000.0'));
const count=fallenWood.length;heroineTick(0,1450);assert.equal(fallenWood.length,count);
console.log('PASS: startup, assets, frame geometry, idle animation, collisions, pickup, unlimited inventory, deposit, chopping');
`,sandbox);
