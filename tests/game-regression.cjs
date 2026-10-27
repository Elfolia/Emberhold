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
drawHeroine(0);const first=heroineElement.src;drawHeroine(240);assert.notEqual(heroineElement.src,first);
// Solid counter edges, fence sides, rear and front; open central gate.
for(const point of [[0,0],[204,0],[-204,0],[340,0],[-340,0],[0,-225],[200,230],[-200,230],[94,180],[-94,180]])assert.ok(blockedAt(...point));
for(const y of [150,200,230,270])assert.equal(blockedAt(0,y),false);
heroine.x=0;heroine.y=140;joystick.y=-1;
for(let i=0;i<100;i++)heroineTick(.05,1000);
assert.ok(heroine.y>=127);joystick.y=0;
// Unbounded inventory, collection exactly once, complete deposit exactly once.
heroine.x=1000;heroine.y=1000;trees=[];woodCarried=1000000;
fallenWood.push({x:1000,y:1000,taken:false});heroineTick(0,1000);heroineTick(0,1000);
assert.equal(woodCarried,1000003);assert.match(woodHud.textContent,/1.000.003/);
heroine.x=0;heroine.y=150;heroineTick(0,1000);heroineTick(0,1000);
assert.equal(woodCarried,0);assert.equal(woodStored,1000003);drawWoodStorage();
// A missed impact interval still applies one chop, and prior chops survive tree rebuilds.
const tree={x:1000,y:1000};heroine.x=1000;heroine.y=1000;heroine.attackAt=1000;
treeChops.set('1000.0:1000.0',2);lastAutoTarget={kind:'tree',obj:tree};
heroineTick(0,1400);assert.ok(gatheredTrees.has('1000.0:1000.0'));
const count=fallenWood.length;heroineTick(0,1450);assert.equal(fallenWood.length,count);
console.log('PASS: startup, assets, frame geometry, idle animation, collisions, pickup, unlimited inventory, deposit, chopping');
`,sandbox);
