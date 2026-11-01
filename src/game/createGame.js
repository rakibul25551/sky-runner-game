import * as THREE from 'three'

/**
 * SKY RUNNER engine (Three.js). No DOM besides the canvas it mounts into.
 * Talks to the React UI through the callbacks in `opts`:
 *   onState('play'|'over'), onHud(score, orbs, speedPercent), onOver(result), onBest(best)
 */
export function createGame(stage, opts = {}) {
const LANES=[-3,0,3], SEG=14, NSEG=14, GAP=6;
const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
let best=0; try{best=+localStorage.getItem('skyrunner.best')||0}catch(e){}
opts.onBest&&opts.onBest(best);

/* ---------- renderer / scene ---------- */
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
stage.appendChild(renderer.domElement);
renderer.domElement.style.cssText='display:block;width:100%;height:100%';
const scene=new THREE.Scene();
const FOG=new THREE.Color(0xff8a6a);
scene.fog=new THREE.Fog(FOG,40,170);
const camera=new THREE.PerspectiveCamera(68,1,.1,400);

// gradient sky as background texture
(function(){
  const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,'#150b3a');gr.addColorStop(.38,'#4a1a7a');gr.addColorStop(.62,'#c43a7c');gr.addColorStop(.8,'#ff6a5c');gr.addColorStop(1,'#ffc27a');
  g.fillStyle=gr;g.fillRect(0,0,4,256);
  scene.background=new THREE.CanvasTexture(c);
})();
const hemi=new THREE.HemisphereLight(0xffb9a0,0x2a1a5a,.9);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd2a0,.9);sun.position.set(-10,20,-30);scene.add(sun);

function glowTex(inner,outer){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,inner);gr.addColorStop(1,outer);
  g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
// big low sun
const sunSpr=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('rgba(255,244,200,1)','rgba(255,160,90,0)'),fog:false,depthWrite:false,transparent:true}));
sunSpr.scale.set(170,170,1);sunSpr.position.set(-30,18,-300);scene.add(sunSpr);


/* ---------- richer backdrop: stars, ringed planet, skyline, aurora, motes ---------- */
const farGroup=new THREE.Group();scene.add(farGroup);
// stars (upper sky only)
const SN=700,sPos=new Float32Array(SN*3),sCol=new Float32Array(SN*3);
for(let i=0;i<SN;i++){
  const a=rand(0,Math.PI*2),e=rand(.18,1.1),r=330;
  sPos[i*3]=Math.cos(a)*Math.cos(e)*r;sPos[i*3+1]=Math.sin(e)*r*.75+10;sPos[i*3+2]=-Math.abs(Math.sin(a)*Math.cos(e))*r-40;
  const c=pick([[1,1,1],[.8,.9,1],[1,.85,.9]]);sCol.set(c,i*3);
}
const sGeo=new THREE.BufferGeometry();sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));sGeo.setAttribute('color',new THREE.BufferAttribute(sCol,3));
const stars=new THREE.Points(sGeo,new THREE.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.9,fog:false,depthWrite:false}));
farGroup.add(stars);
// ringed planet
(function(){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const gr=g.createRadialGradient(100,100,10,128,128,70);gr.addColorStop(0,'#ffd9e8');gr.addColorStop(.6,'#c77dd6');gr.addColorStop(1,'#4a2a8a');
  g.fillStyle=gr;g.beginPath();g.arc(128,128,66,0,7);g.fill();
  g.strokeStyle='rgba(255,220,240,.75)';g.lineWidth=9;g.beginPath();g.ellipse(128,128,118,26,-.32,0,7);g.stroke();
  g.strokeStyle='rgba(255,170,220,.45)';g.lineWidth=5;g.beginPath();g.ellipse(128,128,100,20,-.32,0,7);g.stroke();
  g.globalCompositeOperation='destination-out';g.fillStyle='#000';g.beginPath();g.arc(100,98,60,0,7);g.fill(); // not used: keeps ring behind planet look simple
  const t=new THREE.CanvasTexture(c);
  const m=new THREE.Sprite(new THREE.SpriteMaterial({map:t,fog:false,transparent:true,depthWrite:false}));
  m.scale.set(120,120,1);m.position.set(95,105,-310);farGroup.add(m);
})();
// distant skyline layers (silhouettes with lit windows)
function skylineTex(base,lit,seed){
  const W=1024,H=256,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  let x=0;while(x<W){const w=rand(18,60),h=rand(40,seed?200:130);g.fillStyle=base;g.fillRect(x,H-h,w,h);
    if(Math.random()<.4){g.fillRect(x+w*.4,H-h-rand(10,34),w*.15,40)}
    for(let y=H-h+8;y<H-6;y+=9)for(let xx=x+4;xx<x+w-4;xx+=8)if(Math.random()<.22){g.fillStyle=lit;g.fillRect(xx,y,3,4);g.fillStyle=base}
    x+=w+rand(0,6)}
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.repeat.set(2,1);return t;
}
const skyline=[];
[['#5a1f6e','#ffc27a',-340,-4,1.0,.55],['#34124f','#7df3ff',-300,-9,.75,.8],['#1a0a33','#ff9fd0',-260,-15,.55,1]].forEach(([base,lit,z,y,sc,par],i)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(900,170*sc),new THREE.MeshBasicMaterial({map:skylineTex(base,lit,i),transparent:true,fog:false,depthWrite:false}));
  m.position.set(0,y+170*sc/2-10,z);m.userData={par,ox:0};scene.add(m);skyline.push(m);
});
// aurora ribbons
function auroraTex(){
  const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(60,242,255,0)');gr.addColorStop(.45,'rgba(60,242,255,.55)');gr.addColorStop(.7,'rgba(255,61,139,.35)');gr.addColorStop(1,'rgba(255,61,139,0)');
  g.fillStyle=gr;g.fillRect(0,0,512,128);
  g.globalCompositeOperation='destination-in';const m=g.createLinearGradient(0,0,512,0);m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(.2,'#000');m.addColorStop(.8,'#000');m.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=m;g.fillRect(0,0,512,128);
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;return t;
}
const auroras=[];
for(let i=0;i<2;i++){
  const geo=new THREE.PlaneGeometry(420,60,40,1);
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:auroraTex(),transparent:true,blending:THREE.AdditiveBlending,fog:false,depthWrite:false,side:THREE.DoubleSide,opacity:.55-i*.15}));
  m.position.set(-60+i*120,112+i*22,-290-i*20);m.rotation.z=i?.08:-.06;m.userData={i,base:geo.attributes.position.array.slice()};scene.add(m);auroras.push(m);
}
// floating motes around the track (depth and speed cue)
const MN=140,mPos=new Float32Array(MN*3),mGeo=new THREE.BufferGeometry();
for(let i=0;i<MN;i++){mPos[i*3]=rand(-16,16);mPos[i*3+1]=rand(-1,12);mPos[i*3+2]=-rand(0,90)}
mGeo.setAttribute('position',new THREE.BufferAttribute(mPos,3));
const motes=new THREE.Points(mGeo,new THREE.PointsMaterial({map:glowTex('rgba(255,255,255,1)','rgba(255,255,255,0)'),size:.45,color:0xffe9b0,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));
motes.frustumCulled=false;scene.add(motes);
const fallMat=new THREE.MeshBasicMaterial({color:0x7df3ff,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false});

/* ---------- shared materials / geometry ---------- */
const matFloor=new THREE.MeshStandardMaterial({color:0x2b2352,roughness:.55,metalness:.4});
const matEdge=new THREE.LineBasicMaterial({color:0x3cf2ff,transparent:true,opacity:.75});
const matRailA=new THREE.MeshBasicMaterial({color:0x3cf2ff,fog:true}),matRailB=new THREE.MeshBasicMaterial({color:0xff3d8b});
const matHaz=new THREE.MeshStandardMaterial({color:0xff7a1a,emissive:0xff4a00,emissiveIntensity:.55,roughness:.5});
const matBlock=new THREE.MeshStandardMaterial({color:0x3a2a7a,emissive:0x6a2fff,emissiveIntensity:.35,roughness:.4,metalness:.3});
const matBeam=new THREE.MeshStandardMaterial({color:0xff3d8b,emissive:0xff1f6f,emissiveIntensity:.8});
const matOrb=new THREE.MeshBasicMaterial({color:0xffd24a});
const geoOrb=new THREE.OctahedronGeometry(.42,0);
const geoTile=new THREE.BoxGeometry(2.9,1,SEG), geoHalf=new THREE.BoxGeometry(2.9,1,(SEG-GAP)/2);
const edgeTile=new THREE.EdgesGeometry(geoTile), edgeHalf=new THREE.EdgesGeometry(geoHalf);
const geoRail=new THREE.BoxGeometry(.18,.18,SEG);
const geoBarrier=new THREE.BoxGeometry(2.6,1,.8), geoBlock=new THREE.BoxGeometry(2.6,3.2,2.6), geoBeam=new THREE.BoxGeometry(2.8,.5,.6), geoPost=new THREE.BoxGeometry(.3,1.8,.3);

/* ---------- track ---------- */
const segs=[];
for(let i=0;i<NSEG;i++){const g=new THREE.Group();scene.add(g);segs.push({g,z:0,obst:[],orbs:[],pows:[],gaps:[0,0,0],idx:i})}
const powTex={};
function powTexture(type){
  if(powTex[type])return powTex[type];
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const col={magnet:'#ff3d5a',double:'#ffb300',shield:'#2ecc71'}[type];
  const gr=g.createRadialGradient(64,64,10,64,64,62);gr.addColorStop(0,col);gr.addColorStop(.72,col);gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.beginPath();g.arc(64,64,62,0,7);g.fill();
  g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=7;g.beginPath();g.arc(64,64,48,0,7);g.stroke();
  g.lineCap='round';g.lineJoin='round';
  if(type==='magnet'){g.lineWidth=15;g.strokeStyle='#fff';g.beginPath();g.arc(64,66,22,Math.PI,0,false);g.lineTo(86,92);g.moveTo(42,66);g.lineTo(42,92);g.stroke();
    g.fillStyle='#3cf2ff';g.fillRect(34,88,17,12);g.fillRect(77,88,17,12)}
  else if(type==='double'){g.font='bold 62px Arial Black,Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('x2',64,68)}
  else {g.lineWidth=8;g.beginPath();g.moveTo(64,28);g.lineTo(92,40);g.lineTo(90,68);g.quadraticCurveTo(84,90,64,100);g.quadraticCurveTo(44,90,38,68);g.lineTo(36,40);g.closePath();g.stroke();g.globalAlpha=.35;g.fill();}
  return powTex[type]=new THREE.CanvasTexture(c);
}
function addPower(s,type,lane,z){
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:powTexture(type),transparent:true,depthWrite:false,fog:false}));
  sp.scale.set(1.9,1.9,1);sp.position.set(LANES[lane],1.5,z);s.g.add(sp);s.pows.push({sp,type});
}
function clearSeg(s){while(s.g.children.length)s.g.remove(s.g.children[0]);s.obst=[];s.orbs=[];s.pows=[];s.gaps=[0,0,0]}
function addOrb(s,x,y,z){const m=new THREE.Mesh(geoOrb,matOrb);m.position.set(x,y,z);s.g.add(m);s.orbs.push(m)}
function addObst(s,type,lane,z){
  const x=LANES[lane];let m,h,hd,bot=0;
  if(type==='barrier'){m=new THREE.Mesh(geoBarrier,matHaz);m.position.set(x,.5,z);h=1.05;hd=.4;}
  else if(type==='block'){m=new THREE.Mesh(geoBlock,matBlock);m.position.set(x,1.6,z);h=3.2;hd=1.3;}
  else {m=new THREE.Mesh(geoBeam,matBeam);m.position.set(x,1.7,z);bot=1.45;h=2;hd=.3;
    for(const sx of[-1.25,1.25]){const p=new THREE.Mesh(geoPost,matBlock);p.position.set(x+sx,.9,z);s.g.add(p)}}
  s.g.add(m);s.obst.push({type,x,z,hd,top:h,bot,hw:1.3});
}
function buildSeg(s,safe){
  clearSeg(s);
  const d=Math.min(1,run.dist/2600);
  // floor
  let gapLanes=[];
  let kind='empty';
  if(!safe){
    const r=Math.random(), w=[['empty',.1+.1*(1-d)],['orbs',.2],['barrier',.2],['beam',.15],['block',.2],['gap',.15+.05*d],['combo',.12*d+.04]];
    let tot=w.reduce((a,b)=>a+b[1],0),t=r*tot;for(const[k,v]of w){t-=v;if(t<=0){kind=k;break}}
  } else kind=Math.random()<.5?'orbs':'empty';
  if(!safe&&run.speed>30&&lastHard&&Math.random()<.65)kind='orbs';   // breathing room at high speed
  if(kind==='combo'&&run.speed>30)kind='block';
  lastHard=!(kind==='empty'||kind==='orbs');
  const lanes=[0,1,2].sort(()=>Math.random()-.5);
  const two=Math.random()<.35+.3*d;
  if(kind==='gap'){gapLanes=two?lanes.slice(0,2):[lanes[0]]}
  for(let l=0;l<3;l++){
    const x=LANES[l];
    if(gapLanes.includes(l)){
      s.gaps[l]=1;
      for(const sz of[-1,1]){
        const m=new THREE.Mesh(geoHalf,matFloor);m.position.set(x,-.5,sz*(GAP/2+(SEG-GAP)/4));s.g.add(m);
        const e=new THREE.LineSegments(edgeHalf,matEdge);e.position.copy(m.position);s.g.add(e);
      }
    } else {
      const m=new THREE.Mesh(geoTile,matFloor);m.position.set(x,-.5,0);s.g.add(m);
      const e=new THREE.LineSegments(edgeTile,matEdge);e.position.copy(m.position);s.g.add(e);
    }
  }
  for(const sx of[-4.7,4.7]){const r=new THREE.Mesh(geoRail,s.idx%2?matRailA:matRailB);r.position.set(sx,.12,0);s.g.add(r)}
  const free=lanes[2];
  if(kind==='orbs'){const l=pick([0,1,2]);for(let i=0;i<6;i++)addOrb(s,LANES[l],.9,-5.5+i*2.2)}
  else if(kind==='barrier'){const ls=two?lanes.slice(0,2):[lanes[0]];ls.forEach(l=>{addObst(s,'barrier',l,0);for(let i=-1;i<=1;i++)addOrb(s,LANES[l],2.1+(1-Math.abs(i))*.6,i*2)})}
  else if(kind==='beam'){const ls=two?[0,1,2]:lanes.slice(0,2);ls.forEach(l=>addObst(s,'beam',l,0));for(let i=0;i<5;i++)addOrb(s,LANES[free],.6,-4.4+i*2.2)}
  else if(kind==='block'){const ls=two?lanes.slice(0,2):[lanes[0]];ls.forEach(l=>addObst(s,'block',l,0));const fl=two?free:lanes[1];for(let i=0;i<6;i++)addOrb(s,LANES[fl],.9,-5.5+i*2.2)}
  else if(kind==='gap'){const gl=gapLanes[0];for(let i=-2;i<=2;i++)addOrb(s,LANES[gl],1.6+(2-Math.abs(i))*.5,i*1.7)}
  else if(kind==='combo'){addObst(s,'block',lanes[0],-3.5);(Math.random()<.5?[lanes[1]]:[lanes[1],lanes[2]]).forEach(l=>addObst(s,'barrier',l,3.5));addOrb(s,LANES[lanes[2]],.9,-3.5);addOrb(s,LANES[lanes[2]],.9,-1.5)}
  if(Math.random()<(safe?.03:.13)){
    const occ=new Set(s.obst.map(o=>Math.round((o.x+3)/3)));gapLanes.forEach(l=>occ.add(l));
    const fr=[0,1,2].filter(l=>!occ.has(l));
    if(fr.length){let t=pick(['magnet','double','shield']);if(t===lastPow)t=pick(['magnet','double','shield']);lastPow=t;addPower(s,t,pick(fr),rand(-3,3))}
  }
}

/* ---------- parallax city ---------- */
const cityDusk=[],cityDay=[];let city=cityDusk;
function winTex(){
  const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');
  g.fillStyle='#1d1245';g.fillRect(0,0,64,128);
  for(let y=6;y<124;y+=10)for(let x=6;x<60;x+=12){if(Math.random()<.55){g.fillStyle=pick(['#ffd24a','#3cf2ff','#ff9fd0','#fff2c0']);g.fillRect(x,y,6,5)}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
const winMats=[0,1,2].map(()=>new THREE.MeshStandardMaterial({map:winTex(),emissive:0xffffff,emissiveMap:null,emissiveIntensity:.0,roughness:.8}));
winMats.forEach(m=>{m.emissiveMap=m.map;m.emissiveIntensity=0});
const rockMat=new THREE.MeshStandardMaterial({color:0x3b2a63,roughness:1,flatShading:true});
function makeIsland(){
  const g=new THREE.Group();
  const rock=new THREE.Mesh(new THREE.ConeGeometry(rand(7,13),rand(10,20),7),rockMat);rock.rotation.x=Math.PI;rock.position.y=-rand(5,9);g.add(rock);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(rand(8,13),rand(8,13),1.2,7),new THREE.MeshStandardMaterial({color:0x2f6b5a,roughness:.9,flatShading:true}));top.position.y=.4;g.add(top);
  if(Math.random()<.5){const wf=new THREE.Mesh(new THREE.BoxGeometry(rand(.6,1.4),rand(22,40),.5),fallMat);wf.position.set(rand(-6,6),-rand(18,26),rand(6,9));g.add(wf)}
  const n=Math.floor(rand(2,5));
  for(let i=0;i<n;i++){
    const w=rand(3,6),h=rand(8,26),m=winMats[i%3].clone();m.map=winMats[i%3].map.clone();m.map.needsUpdate=true;m.map.repeat.set(w/6,h/12);m.emissiveMap=m.map;m.emissive=new THREE.Color(0xffffff);m.emissiveIntensity=.9;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),m);b.position.set(rand(-6,6),h/2+1,rand(-6,6));g.add(b);
  }
  return g;
}
const ISL=18;
for(let i=0;i<ISL;i++){
  const g=makeIsland();const side=i%2?1:-1;
  g.userData={side,par:rand(.55,1)};
  g.position.set(side*rand(24,80),rand(-14,10),-rand(0,SEG*NSEG));g.rotation.y=rand(0,6);
  scene.add(g);cityDusk.push(g);
}
const cloudTex=glowTex('rgba(255,200,190,.55)','rgba(255,150,170,0)');
const cloudTexDay=glowTex('rgba(255,255,255,.95)','rgba(255,255,255,0)');
const clouds=[];
for(let i=0;i<26;i++){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,opacity:rand(.35,.8)}));
  s.scale.set(rand(30,70),rand(10,22),1);s.position.set(rand(-90,90),-rand(14,30),-rand(0,SEG*NSEG));s.userData.par=rand(.8,1);scene.add(s);clouds.push(s);
}


/* ---------- DAY world: grassy islands, houses, waterfalls, airships, mountains ---------- */
const rockDay=new THREE.MeshStandardMaterial({color:0x8a6a4a,roughness:1,flatShading:true});
const grassMat=new THREE.MeshStandardMaterial({color:0x5cb34a,roughness:.9,flatShading:true});
const leafMats=[0x2f8f4a,0x3fae54,0x6cc04a].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}));
const trunkMat=new THREE.MeshStandardMaterial({color:0x6b4a2b,roughness:1});
const wallMat=new THREE.MeshStandardMaterial({color:0xf3e6c8,roughness:.9}), roofMat=new THREE.MeshStandardMaterial({color:0xc4553a,roughness:.8,flatShading:true});
const fallDay=new THREE.MeshBasicMaterial({color:0xe8fbff,transparent:true,opacity:.6,depthWrite:false});
const gTrunk=new THREE.CylinderGeometry(.25,.35,1.6,6), gLeaf1=new THREE.ConeGeometry(1.7,3.2,7), gLeaf2=new THREE.ConeGeometry(1.2,2.4,7), gWall=new THREE.BoxGeometry(3,2.2,3), gRoof=new THREE.ConeGeometry(2.8,1.8,4);
function makeDayIsland(){
  const g=new THREE.Group(),R=rand(8,13);
  const rock=new THREE.Mesh(new THREE.ConeGeometry(R,rand(10,20),8),rockDay);rock.rotation.x=Math.PI;rock.position.y=-rand(5,9);g.add(rock);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(R,R*.95,1.6,8),grassMat);top.position.y=.5;g.add(top);
  const nt=Math.floor(rand(3,8));
  for(let i=0;i<nt;i++){
    const a=rand(0,6.28),r=rand(0,R*.75),lm=pick(leafMats),sc=rand(.8,1.5);
    const t=new THREE.Group();t.position.set(Math.cos(a)*r,1.3,Math.sin(a)*r);t.scale.setScalar(sc);
    const tr=new THREE.Mesh(gTrunk,trunkMat);tr.position.y=.8;t.add(tr);
    const l1=new THREE.Mesh(gLeaf1,lm);l1.position.y=2.6;t.add(l1);const l2=new THREE.Mesh(gLeaf2,lm);l2.position.y=4.2;t.add(l2);g.add(t);
  }
  if(Math.random()<.6){const h=new THREE.Group();const w=new THREE.Mesh(gWall,wallMat);w.position.y=1.1;h.add(w);const r=new THREE.Mesh(gRoof,roofMat);r.position.y=3.1;r.rotation.y=Math.PI/4;h.add(r);h.position.set(rand(-R*.4,R*.4),1.3,rand(-R*.4,R*.4));h.scale.setScalar(rand(.9,1.6));g.add(h)}
  if(Math.random()<.55){const wf=new THREE.Mesh(new THREE.BoxGeometry(rand(.8,1.8),rand(26,44),.5),fallDay);wf.position.set(rand(-R*.5,R*.5),-rand(18,28),R*.82);g.add(wf)}
  return g;
}
for(let i=0;i<ISL;i++){
  const g=makeDayIsland();const side=i%2?1:-1;
  g.userData={side,par:rand(.55,1)};
  g.position.set(side*rand(24,80),rand(-14,10),-rand(0,SEG*NSEG));g.rotation.y=rand(0,6);
  g.visible=false;scene.add(g);cityDay.push(g);
}
// airships
const airships=[];
(function(){
  const hull=new THREE.MeshStandardMaterial({color:0xd9694a,roughness:.7}),band=new THREE.MeshStandardMaterial({color:0xf5e6c4,roughness:.7}),wood=new THREE.MeshStandardMaterial({color:0x6b4a2b,roughness:.9});
  for(let i=0;i<3;i++){
    const g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),hull);b.scale.set(3.4,1.3,1.3);g.add(b);
    const st=new THREE.Mesh(new THREE.TorusGeometry(1,.09,6,20),band);st.scale.set(1.1,1.3,1.3);st.rotation.y=Math.PI/2;st.position.x=.5;g.add(st);
    const gon=new THREE.Mesh(new THREE.BoxGeometry(2.4,.6,.8),wood);gon.position.y=-1.5;g.add(gon);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.9,1.1,.12),hull);fin.position.set(-3.2,.1,0);g.add(fin);
    g.scale.setScalar(rand(3.5,6));g.position.set((i%2?1:-1)*rand(35,95),rand(6,34),-rand(120,300));g.rotation.y=(i%2?1:-1)*.25;
    g.userData={bob:rand(0,6),par:.3};g.visible=false;scene.add(g);airships.push(g);
  }
})();
// misty mountains
function mountainTex(col,h0){
  const W=1024,H=256,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(200,228,250,.7)');g.fillStyle=gr;
  g.beginPath();g.moveTo(0,H);let x=0;while(x<W+60){const pk=rand(h0*.5,h0);g.lineTo(x,H-pk*.55);g.lineTo(x+rand(40,90),H-pk);x+=rand(80,160)}g.lineTo(W,H);g.closePath();g.fill();
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.repeat.set(2,1);return t;
}
const mountains=[];
[['#6c9fd6',200,-340,2,.5],['#5a98b8',150,-290,-4,.75],['#4f9a78',110,-250,-10,1]].forEach(([col,h,z,y,par])=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(900,170),new THREE.MeshBasicMaterial({map:mountainTex(col,h),transparent:true,fog:false,depthWrite:false}));
  m.position.set(0,y+75,z);m.userData={par};m.visible=false;scene.add(m);mountains.push(m);
});
// high clouds (day only)
const highClouds=[];
for(let i=0;i<14;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTexDay,transparent:true,depthWrite:false,opacity:rand(.7,1)}));
  sp.scale.set(rand(40,90),rand(14,26),1);sp.position.set(rand(-160,160),rand(18,70),-rand(130,300));sp.userData.par=rand(.2,.4);sp.visible=false;scene.add(sp);highClouds.push(sp)}
// plank texture for the wooden track
const plankTex=(function(){
  const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d');
  g.fillStyle='#e9c79a';g.fillRect(0,0,64,128);
  for(let y=0;y<128;y+=32){g.fillStyle='rgba(60,35,15,.55)';g.fillRect(0,y,64,2);for(let k=0;k<5;k++){g.fillStyle='rgba(120,80,40,.18)';g.fillRect(rand(0,60),y+rand(4,28),rand(6,30),1)}}
  g.fillStyle='rgba(60,35,15,.4)';g.fillRect(0,0,2,128);g.fillRect(62,0,2,128);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,4);return t;
})();

/* ---------- themes ---------- */
const THEMES={
  dusk:{stops:[[0,'#150b3a'],[.38,'#4a1a7a'],[.62,'#c43a7c'],[.8,'#ff6a5c'],[1,'#ffc27a']],fog:[0xff8a6a,40,170],
    hemi:[0xffb9a0,0x2a1a5a,.9],sun:[0xffd2a0,.9,[-10,20,-30]],floor:[0x2b2352,null],edge:[0x3cf2ff,.75],rails:[0x3cf2ff,0xff3d8b],block:[0x3a2a7a,0x6a2fff,.35],
    sunSpr:['rgba(255,244,200,1)','rgba(255,160,90,0)',170,[-30,18,-300]],motes:[0xffe9b0,.7,THREE.AdditiveBlending]},
  day:{stops:[[0,'#2c74da'],[.4,'#5aaeff'],[.75,'#a9d8ff'],[1,'#eaf6ff']],fog:[0xcfe6ff,55,200],
    hemi:[0xd8ecff,0x5f8a4a,1.05],sun:[0xfff1d0,1.0,[-20,40,-20]],floor:[0x9c6a38,plankTex],edge:[0x3a2410,.85],rails:[0xffffff,0x9a6a3a],block:[0xb9b3a6,0x000000,0],
    sunSpr:['rgba(255,255,240,.95)','rgba(255,240,180,0)',85,[-70,70,-300]],motes:[0xffffff,.55,THREE.NormalBlending]},
};
let themeName='day';
function skyTexture(stops){
  const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,256);stops.forEach(([o,col])=>gr.addColorStop(o,col));g.fillStyle=gr;g.fillRect(0,0,4,256);
  return new THREE.CanvasTexture(c);
}
function applyTheme(name){
  const T=THEMES[name];if(!T)return;themeName=name;const day=name==='day';
  scene.background=skyTexture(T.stops);scene.fog.color.set(T.fog[0]);scene.fog.near=T.fog[1];scene.fog.far=T.fog[2];
  hemi.color.set(T.hemi[0]);hemi.groundColor.set(T.hemi[1]);hemi.intensity=T.hemi[2];
  sun.color.set(T.sun[0]);sun.intensity=T.sun[1];sun.position.set(...T.sun[2]);
  matFloor.color.set(T.floor[0]);matFloor.map=T.floor[1];matFloor.roughness=day?.85:.55;matFloor.metalness=day?0:.4;matFloor.needsUpdate=true;
  matEdge.color.set(T.edge[0]);matEdge.opacity=T.edge[1];
  matRailA.color.set(T.rails[0]);matRailB.color.set(T.rails[1]);
  matBlock.color.set(T.block[0]);matBlock.emissive.set(T.block[1]);matBlock.emissiveIntensity=T.block[2];
  sunSpr.material.map=glowTex(T.sunSpr[0],T.sunSpr[1]);sunSpr.material.needsUpdate=true;sunSpr.scale.set(T.sunSpr[2],T.sunSpr[2],1);sunSpr.position.set(...T.sunSpr[3]);
  motes.material.color.set(T.motes[0]);motes.material.opacity=T.motes[1];motes.material.blending=T.motes[2];motes.material.needsUpdate=true;motes.visible=!day;
  stars.visible=!day;farGroup.visible=!day;skyline.forEach(m=>m.visible=!day);auroras.forEach(m=>m.visible=!day);
  mountains.forEach(m=>m.visible=day);highClouds.forEach(m=>m.visible=day);airships.forEach(m=>m.visible=day);
  cityDusk.forEach(g=>g.visible=!day);cityDay.forEach(g=>g.visible=day);city=day?cityDay:cityDusk;
  clouds.forEach(c=>{c.material.map=day?cloudTexDay:cloudTex;c.material.needsUpdate=true;c.material.opacity=day?rand(.55,.95):rand(.35,.8)});
  try{localStorage.setItem('skyrunner.theme',name)}catch(e){}
  opts.onTheme&&opts.onTheme(name);
}

/* ---------- player ---------- */
const hero=new THREE.Group();scene.add(hero);
const bodyMat=new THREE.MeshStandardMaterial({color:0xf4f0ff,roughness:.35,metalness:.2});
const accMat=new THREE.MeshStandardMaterial({color:0xff3d8b,emissive:0xff1f6f,emissiveIntensity:.5});
const torso=new THREE.Mesh(new THREE.BoxGeometry(.7,.85,.4),bodyMat);torso.position.y=1.15;
const head=new THREE.Mesh(new THREE.SphereGeometry(.3,16,12),bodyMat);head.position.y=1.8;
const visor=new THREE.Mesh(new THREE.BoxGeometry(.4,.14,.2),new THREE.MeshBasicMaterial({color:0x3cf2ff}));visor.position.set(0,1.82,-.2);
const pack=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.25),accMat);pack.position.set(0,1.2,.32);
function limb(x,y,w,h){const p=new THREE.Group();p.position.set(x,y,0);const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),bodyMat);m.position.y=-h/2;p.add(m);return p}
const legL=limb(-.18,.75,.22,.75),legR=limb(.18,.75,.22,.75),armL=limb(-.46,1.5,.18,.6),armR=limb(.46,1.5,.18,.6);
const body=new THREE.Group();body.add(torso,head,visor,pack,legL,legR,armL,armR);hero.add(body);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.5,16),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;scene.add(shadow);

/* ---------- particles ---------- */
const PN=500,pPos=new Float32Array(PN*3),pCol=new Float32Array(PN*3),pVel=new Float32Array(PN*3),pLife=new Float32Array(PN);
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const dotTex=glowTex('rgba(255,255,255,1)','rgba(255,255,255,0)');
const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({map:dotTex,size:.4,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
pts.frustumCulled=false;scene.add(pts);let pHead=0;
function emit(x,y,z,vx,vy,vz,r,g,b,life){const i=pHead++%PN;pPos.set([x,y,z],i*3);pVel.set([vx,vy,vz],i*3);pCol.set([r,g,b],i*3);pLife[i]=life}
function burst(x,y,z,n,col,sp){for(let i=0;i<n;i++)emit(x,y,z,rand(-sp,sp),rand(-sp*.2,sp),rand(-sp,sp),col[0],col[1],col[2],rand(.4,.9))}

try{const t=localStorage.getItem('skyrunner.theme');if(t&&THEMES[t])themeName=t}catch(e){}
applyTheme(themeName);

/* ---------- audio ---------- */
let AC=null,muted=false;
function beep(f,d,type,v,slide){if(muted)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.value=f;if(slide)o.frequency.exponentialRampToValueAtTime(slide,AC.currentTime+d);g.gain.value=v||.05;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}}

/* ---------- game state ---------- */
const BASE=22,MAXS=46,REVIVE_COST=12;
const run={state:'menu',dist:0,orbs:0,speed:0,t:0,magnet:0,dbl:0,shield:false,invul:0,revived:false};
let pending=0,lastHard=false,lastPow='',lastPJ='';
const P={lane:1,x:0,y:0,vy:0,grounded:true,slide:0,fall:false,deadT:0};
let shake=0,camX=0,tilt=0;
function reset(){
  if(pending>best){best=pending;try{localStorage.setItem('skyrunner.best',best)}catch(e){}opts.onBest&&opts.onBest(best)}
  pending=0;lastHard=false;
  run.state='play';run.dist=0;run.orbs=0;run.speed=BASE;run.t=0;run.magnet=0;run.dbl=0;run.shield=false;run.invul=0;run.revived=false;hero.visible=true;
  P.lane=1;P.x=0;P.y=0;P.vy=0;P.grounded=true;P.slide=0;P.fall=false;P.deadT=0;shake=0;
  segs.forEach((s,i)=>{s.z=-i*SEG+SEG*2;buildSeg(s,i<5||i>NSEG-3?true:false)});
  // first rows safe
  segs.forEach((s,i)=>{if(s.z>-SEG*3){clearSeg(s);buildSeg(s,true)}});
  opts.onState&&opts.onState('play');
}
function end(why){
  if(run.state!=='play')return;
  run.state='dead';P.deadT=0;shake=1;beep(180,.5,'sawtooth',.09,40);
  burst(hero.position.x,1.2,0,60,[1,.3,.5],9);
  if(why==='fall'){P.fall=true}
  setTimeout(showOver,900);
}
function showOver(){
  const score=Math.floor(run.dist)+run.orbs*25;
  const canRevive=!run.revived&&run.orbs>=REVIVE_COST;
  let nb=false;
  if(canRevive){pending=score}
  else{nb=score>best;if(nb){best=score;try{localStorage.setItem('skyrunner.best',best)}catch(e){}}pending=0}
  opts.onBest&&opts.onBest(best);
  opts.onOver&&opts.onOver({score,dist:Math.floor(run.dist),orbs:run.orbs,newBest:nb,best,canRevive,reviveCost:REVIVE_COST,revived:run.revived});
  opts.onState&&opts.onState('over');
}
// put the runner back on solid ground with a short invulnerability window
function rescue(){
  P.fall=false;P.y=0;P.vy=0;P.grounded=true;P.slide=0;
  segs.forEach(sg=>{if(sg.z>-80&&sg.z<30){clearSeg(sg);buildSeg(sg,true)}});
  run.invul=Math.max(run.invul,2.4);
}
function revive(){
  if(run.state!=='dead'||run.revived||run.orbs<REVIVE_COST)return false;
  run.orbs-=REVIVE_COST;run.revived=true;pending=0;run.state='play';P.deadT=0;shake=0;
  rescue();beep(440,.35,'triangle',.07,880);burst(hero.position.x,1.2,0,40,[.4,1,.7],6);
  opts.onState&&opts.onState('play');return true;
}
function hit(){
  if(run.invul>0)return;
  if(run.shield){run.shield=false;run.invul=1.6;shake=.5;beep(300,.25,'triangle',.07,120);burst(P.x,1.2,0,30,[.3,1,.6],7);return}
  end('hit');
}

/* ---------- input ---------- */
function moveLane(d){if(run.state!=='play')return;const n=P.lane+d;if(n<0||n>2)return;P.lane=n;beep(520,.08,'triangle',.04,700)}
function jump(){if(run.state!=='play')return;if(P.grounded){P.vy=14;P.grounded=false;P.slide=0;beep(330,.18,'square',.05,660)}}
function slide(){if(run.state!=='play')return;if(!P.grounded){P.vy=-26}else if(P.slide<=0){P.slide=.65;beep(200,.2,'sawtooth',.04,90)}}
const onKey=e=>{
  const k=e.code;
  if(k==='KeyT'&&!e.repeat){applyTheme(themeName==='day'?'dusk':'day');return}
  if(run.state!=='play'){if((k==='Space'||k==='Enter')&&!e.repeat){reset();e.preventDefault()}return}
  if(k==='ArrowLeft'||k==='KeyA')moveLane(-1);
  else if(k==='ArrowRight'||k==='KeyD')moveLane(1);
  else if(k==='ArrowUp'||k==='KeyW'||k==='Space'){jump();e.preventDefault()}
  else if(k==='ArrowDown'||k==='KeyS'){slide();e.preventDefault()}
  else if(k==='KeyM')muted=!muted;
};
addEventListener('keydown',onKey);
let tx=0,ty=0,tt=0,tdone=false;
const onDown=e=>{tx=e.clientX;ty=e.clientY;tt=performance.now();tdone=false};
stage.addEventListener('pointerdown',onDown);
const onMove=e=>{if(tdone||run.state!=='play'||!(e.buttons||e.pointerType==='touch'))return;const dx=e.clientX-tx,dy=e.clientY-ty;
  if(Math.abs(dx)>38&&Math.abs(dx)>Math.abs(dy)){moveLane(dx>0?1:-1);tdone=true}
  else if(Math.abs(dy)>38){dy<0?jump():slide();tdone=true}};
stage.addEventListener('pointermove',onMove);
const onUp=()=>{if(!tdone&&run.state==='play'&&performance.now()-tt<250)jump()};
stage.addEventListener('pointerup',onUp);

/* ---------- update ---------- */
function floorAt(lane){ // is there floor under the player (world z = 0) in this lane?
  for(const s of segs){
    const lz=-s.z; if(lz<-SEG/2||lz>=SEG/2)continue;
    if(s.gaps[lane]&&Math.abs(lz)<GAP/2)return false;
    return true;
  }
  return true;
}
function update(dt){
  const play=run.state==='play';
  if(play){
    run.t+=dt;run.magnet=Math.max(0,run.magnet-dt);run.dbl=Math.max(0,run.dbl-dt);run.invul=Math.max(0,run.invul-dt);run.speed=Math.min(MAXS,BASE+run.dist*.0065);run.dist+=run.speed*dt;
  }
  const mv=play?run.speed:(run.state==='dead'?Math.max(0,run.speed*(1-P.deadT*1.8)):0);
  if(run.state==='dead')P.deadT+=dt;
  const dz=mv*dt;
  // move + recycle segments
  for(const s of segs){s.z+=dz;s.g.position.z=s.z}
  for(const s of segs){if(s.z>SEG*2.5){let minz=0;segs.forEach(o=>{if(o.z<minz)minz=o.z});s.z=minz-SEG;s.g.position.z=s.z;buildSeg(s,false)}}
  for(const g of city){g.position.z+=dz*g.userData.par*.85;g.rotation.y+=dt*.02*g.userData.side;if(g.position.z>40){g.position.z-=SEG*NSEG;g.position.x=g.userData.side*rand(24,80);g.position.y=rand(-14,10)}}
  for(const c of clouds){c.position.z+=dz*c.userData.par*.6;c.position.x+=dt*.6;if(c.position.z>60){c.position.z-=SEG*NSEG;c.position.x=rand(-90,90)}}
  // orbs spin
  for(const s of segs){for(const o of s.orbs){o.rotation.y+=dt*3;o.rotation.x+=dt*1.2}for(const pw of s.pows){pw.sp.position.y=1.5+Math.sin(performance.now()*.004+pw.sp.position.x)*.25}}

  // player physics
  const tgt=LANES[P.lane];P.x+=(tgt-P.x)*Math.min(1,dt*14);
  if(play||P.fall){
    P.vy-=(P.fall?30:36)*dt;P.y+=P.vy*dt;
    if(play&&!P.fall){
      const onFloor=floorAt(Math.round((P.x+3)/3));
      if(P.y<=0&&onFloor){if(!P.grounded){shake=Math.max(shake,.25);burst(P.x,.1,0,10,[.9,.8,1],3)}P.y=0;P.vy=0;P.grounded=true}
      else if(P.y<=0&&!onFloor&&P.grounded){P.grounded=false}
      if(P.y<-2.2&&!onFloor){if(run.shield){run.shield=false;burst(P.x,0,0,24,[.3,1,.6],6);beep(300,.25,'triangle',.07,120);rescue()}else if(run.invul>0){rescue()}else{P.fall=true;end('fall')}}
    }
    if(P.slide>0)P.slide-=dt;
  }
  if(P.fall&&run.state==='dead'){/* keep falling */}
  hero.position.set(P.x,P.y,0);
  shadow.position.set(P.x,.03,0);shadow.visible=P.y>-.5&&!P.fall;shadow.scale.setScalar(Math.max(.4,1-P.y*.18));
  // run animation
  const ph=run.t*run.speed*.55;
  const sl=P.slide>0&&P.grounded;
  body.scale.y+=((sl?.5:1)-body.scale.y)*Math.min(1,dt*20);
  body.position.y=sl?-.1:0;
  body.rotation.x+=((sl?-.9:P.grounded?.12:-.15)-body.rotation.x)*Math.min(1,dt*14);
  const sw=P.grounded&&play?Math.sin(ph)*.9:(play?.5:0);
  legL.rotation.x=sw;legR.rotation.x=-sw;armL.rotation.x=-sw*.9;armR.rotation.x=sw*.9;
  body.position.y+=P.grounded&&play?Math.abs(Math.sin(ph))*.07:0;
  hero.rotation.z+=((tgt-P.x)*-.06-hero.rotation.z)*Math.min(1,dt*10);

  if(play){
    // collisions (swept along z so high speed cannot tunnel through obstacles)
    const top=sl?.8:1.8,ptop=P.y+top,pbot=P.y;
    for(const sg of segs){
      if(sg.z<-14||sg.z>14)continue;
      for(const o of sg.obst){
        const wz=sg.z+o.z,tol=o.hd+.35;
        if(wz>-tol&&wz-dz<tol&&Math.abs(P.x-o.x)<o.hw+.2){
          if(o.type==='beam'){if(ptop>o.bot&&pbot<o.top)hit()}
          else if(pbot<o.top-.05)hit()
        }
      }
      if(run.magnet>0&&sg.z>-36&&sg.z<8){
        for(const o of sg.orbs){const wz=sg.z+o.position.z;if(wz<5&&wz>-32){const k=Math.min(1,dt*7);o.position.x+=(P.x-o.position.x)*k;o.position.y+=(P.y+.9-o.position.y)*k;o.position.z+=(-sg.z-o.position.z)*k*.6}}
      }
      for(let i=sg.orbs.length-1;i>=0;i--){
        const o=sg.orbs[i];const wz=sg.z+o.position.z;
        if(wz>-1.4&&wz-dz<1.4&&Math.abs(P.x-o.position.x)<1.2&&Math.abs(P.y+.9-o.position.y)<1.4){
          sg.g.remove(o);sg.orbs.splice(i,1);run.orbs+=run.dbl>0?2:1;beep(880+Math.min(run.orbs,12)*40,.1,'sine',.06);
          burst(o.position.x,o.position.y,wz,10,[1,.82,.3],4);
        }
      }
      for(let i=sg.pows.length-1;i>=0;i--){
        const pw=sg.pows[i],wz=sg.z+pw.sp.position.z;
        if(wz>-1.6&&wz-dz<1.6&&Math.abs(P.x-pw.sp.position.x)<1.5&&Math.abs(P.y+.9-pw.sp.position.y)<1.8){
          sg.g.remove(pw.sp);sg.pows.splice(i,1);
          if(pw.type==='magnet')run.magnet=10;else if(pw.type==='double')run.dbl=12;else run.shield=true;
          beep(660,.25,'triangle',.07,1320);burst(pw.sp.position.x,1.5,wz,24,[1,1,.6],6);
          if(pw.type==='shield')shake=Math.max(shake,.1);
        }
      }
    }
    // trail
    if(P.grounded&&Math.random()<.8)emit(P.x+rand(-.15,.15),.1,.3,rand(-.5,.5),rand(.5,1.5),rand(2,5),.24,.95,1,.4);
    else if(!P.grounded)emit(P.x,P.y+1.1,.5,rand(-.4,.4),rand(-1,0),rand(3,6),1,.5,.3,.35);
    hero.visible=run.invul<=0||Math.floor(performance.now()/90)%2===0;
    if(opts.onPower){const pj=Math.ceil(run.magnet)+'|'+Math.ceil(run.dbl)+'|'+run.shield+'|'+(run.invul>0);if(pj!==lastPJ){lastPJ=pj;opts.onPower({magnet:Math.ceil(run.magnet),dbl:Math.ceil(run.dbl),shield:run.shield})}}
    opts.onHud&&opts.onHud(Math.floor(run.dist)+run.orbs*25,run.orbs,(run.speed-BASE)/(MAXS-BASE)*100);
  }
  // particles
  for(let i=0;i<PN;i++){if(pLife[i]>0){pLife[i]-=dt;pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=(pVel[i*3+2]+mv)*dt;if(pLife[i]<=0)pPos[i*3+1]=-999}}
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;

  // camera
  camX+=((P.x)*.55-camX)*Math.min(1,dt*6);
  shake=Math.max(0,shake-dt*2.2);
  const sh=shake*shake;
  camera.position.set(camX+rand(-sh,sh)*.4,5.4+Math.max(P.y,-3)*.35+rand(-sh,sh)*.4,9.5);
  camera.lookAt(camX*.6,1.6+Math.max(P.y,-3)*.3,-14);
  tilt+=((tgt-P.x)*-.012-tilt)*Math.min(1,dt*6);camera.rotation.z+=tilt;
  camera.fov=68+Math.min(10,(run.speed-BASE)*.5);camera.updateProjectionMatrix();
  sunSpr.position.x=-30+camX*.5;
  skyline.forEach(m=>{m.position.x=-camX*m.userData.par*1.2});
  mountains.forEach(m=>{m.position.x=-camX*m.userData.par*1.2});
  if(themeName==='day'){
    highClouds.forEach(c=>{c.position.x+=dt*(1.5+c.userData.par*3);if(c.position.x>190)c.position.x=-190});
    airships.forEach(a=>{a.userData.bob+=dt;a.position.y+=Math.sin(a.userData.bob)*.01;a.position.x+=dt*1.2*(a.rotation.y>0?1:-1)*.4;a.position.z+=dz*a.userData.par*.3;if(a.position.z>-40){a.position.z=-rand(220,320);a.position.x=pick([-1,1])*rand(35,95)}});
  }
  stars.material.opacity=.75+Math.sin(performance.now()*.002)*.15;
  const tt=performance.now()*.0004;
  auroras.forEach(m=>{const a=m.geometry.attributes.position,b=m.userData.base;for(let k=0;k<a.count;k++){a.array[k*3+1]=b[k*3+1]+Math.sin(b[k*3]*.02+tt*3+m.userData.i*2)*7;}a.needsUpdate=true;m.material.map.offset.x=tt*.6+m.userData.i*.3});
  for(let i=0;i<MN;i++){mPos[i*3+2]+=(mv+2)*dt;mPos[i*3+1]+=Math.sin(tt*6+i)*.01;if(mPos[i*3+2]>12){mPos[i*3+2]=-90;mPos[i*3]=rand(-16,16);mPos[i*3+1]=rand(-1,12)}}
  mGeo.attributes.position.needsUpdate=true;
}

/* ---------- loop ---------- */
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
// idle menu scene: build a calm track so the menu has something behind it
segs.forEach((s,i)=>{s.z=-i*SEG+SEG*2;buildSeg(s,true)});
let last=performance.now();
let raf=0,alive=true;
function frame(t){
  if(!alive)return;
  const dt=Math.min(.05,(t-last)/1000);last=t;
  if(run.state==='menu'){run.t+=dt;run.speed=10;}
  update(run.state==='menu'?dt*.0:dt);
  if(run.state==='menu'){ // slow cinematic drift
    for(const s of segs){s.z+=dt*6;s.g.position.z=s.z}
    for(const s of segs){if(s.z>SEG*2.5){let m=0;segs.forEach(o=>{if(o.z<m)m=o.z});s.z=m-SEG;s.g.position.z=s.z;buildSeg(s,true)}}
    for(const g of city)g.position.z+=dt*5;
  }
  renderer.render(scene,camera);
  raf=requestAnimationFrame(frame);
}
raf=requestAnimationFrame(frame);
return {
  start:reset,
  revive,
  debug:{run,P,segs,addPower,end,hit,rescue},
  setTheme:applyTheme,
  getTheme:()=>themeName,
  dispose(){
    alive=false;cancelAnimationFrame(raf);
    removeEventListener('keydown',onKey);removeEventListener('resize',resize);
    stage.removeEventListener('pointerdown',onDown);stage.removeEventListener('pointermove',onMove);stage.removeEventListener('pointerup',onUp);
    renderer.dispose();if(renderer.domElement.parentNode===stage)stage.removeChild(renderer.domElement);
  },
  state:run,
};
}
