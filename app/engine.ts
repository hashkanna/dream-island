import * as THREE from 'three';
import {ISLANDS, FRIENDS, INITIAL, neighbours, type GameSnapshot} from './world';
import {CloudSound} from './sound';

type Particle={mesh:THREE.Mesh;velocity:THREE.Vector3;life:number;max:number};
type Hop={from:THREE.Vector3;to:THREE.Vector3;target:number;elapsed:number;duration:number;returning:boolean};
type Hooks={update:(s:GameSnapshot)=>void;ready:()=>void;error:(message:string)=>void};

export class Sky {
 private scene=new THREE.Scene();
 private camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,150);
 private renderer:THREE.WebGLRenderer;
 private state:GameSnapshot={...INITIAL, friends:[],visited:[0]};
 private sound=new CloudSound();
 private mats=new Map<string,THREE.MeshStandardMaterial>();
 private islands:THREE.Group[]=[];
 private rings:THREE.Mesh[]=[];
 private stars:THREE.Group[]=[];
 private sleeping:THREE.Group[]=[];
 private followers:THREE.Group[]=[];
 private clouds:THREE.Group[]=[];
 private particles:Particle[]=[];
 private player:THREE.Group;
 private playerColor='#fff9ec';
 private shadow:THREE.Mesh;
 private rain:THREE.Group;
 private markerEls:HTMLElement[]=[];
 private time=0;
 private elapsed=0;
 private lastLanding=0;
 private messageUntil=0;
 private hop:Hop|null=null;
 private raf=0;
 private lastFrame=0;
 private lastEmit=0;
 private target=new THREE.Vector3(-4,1,-2);
 private rainbow:THREE.Group;
 private resizeObserver:ResizeObserver;
 private disposed=false;
 private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 private sphere=new THREE.SphereGeometry(1,20,14);
 private starGeo:THREE.ExtrudeGeometry;

 constructor(private container:HTMLElement, private hooks:Hooks){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.94;
  this.renderer.domElement.setAttribute('aria-label','A playful 3D sky full of floating pastel islands');
  this.container.appendChild(this.renderer.domElement);
  this.scene.fog=new THREE.Fog('#d8e8f1',42,85);
  const hemi=new THREE.HemisphereLight('#fff7e5','#b2bbdf',1.9);this.scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff3d7',2.6);sun.position.set(-10,22,15);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;sun.shadow.normalBias=.06;sun.shadow.bias=-.0001;sun.shadow.radius=3;this.scene.add(sun);
  const fill=new THREE.DirectionalLight('#d3cbff',1.2);fill.position.set(8,8,-12);this.scene.add(fill);
  const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.115:.25;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
  this.starGeo=new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:true,bevelThickness:.04,bevelSize:.035,bevelSegments:2,steps:1});this.starGeo.center();
  ISLANDS.forEach((p,id)=>this.makeIsland(id));
  this.player=this.critter('#fff9ec',false);this.player.position.set(0,.7,4);this.scene.add(this.player);
  this.shadow=new THREE.Mesh(new THREE.CircleGeometry(.65,28),new THREE.MeshBasicMaterial({color:'#677b8c',transparent:true,opacity:.18,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.scene.add(this.shadow);
  FRIENDS.forEach(f=>{const o=this.critter(f.color,false);o.scale.setScalar(.56);o.visible=false;this.followers.push(o);this.scene.add(o);});
  this.rain=this.makeCloud('#a3adce',true);this.rain.visible=false;this.scene.add(this.rain);
  this.rainbow=new THREE.Group();const colors=['#ffadbb','#ffd28f','#ffeaa5','#b2e0b8','#a2d9ee','#c4b4e9'];
  colors.forEach((c,i)=>{const pts=[];for(let k=0;k<=48;k++){let a=k/48*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*(1.5-i*.105),Math.sin(a)*(1.5-i*.105)+.38,-.7));}const arc=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.066,6,false),this.mat(c));this.rainbow.add(arc);});
  this.rainbow.position.set(0,.5,4);this.scene.add(this.rainbow);
  for(let i=0;i<16;i++){const cl=this.makeCloud(i%3?'#fff7f6':'#eacdeb');cl.position.set((i%4-1.5)*11+(i%2)*4,-3.5-(i%3)*1.4,-18+Math.floor(i/4)*12);cl.scale.setScalar(1.3+(i%3)*.5);this.clouds.push(cl);this.scene.add(cl);}
  try{this.state.best=Number(localStorage.getItem('cloudhop-best')??0)||0;}catch{}
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
  window.addEventListener('keydown',this.key);document.addEventListener('visibilitychange',this.visibility);
  this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
  this.raf=requestAnimationFrame(this.frame);this.hooks.ready();this.emit();
 }
 private mat(color:string){let m=this.mats.get(color);if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.78,metalness:0});this.mats.set(color,m);}return m;}
 private ball(parent:THREE.Group,color:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){const o=new THREE.Mesh(this.sphere,this.mat(color));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 private critter(color:string,sleep:boolean){
  const g=new THREE.Group();this.ball(g,color,0,0,0,.62,.55,.49);this.ball(g,color,-.48,-.06,0,.33,.31,.35);this.ball(g,color,.48,-.06,0,.33,.31,.35);this.ball(g,color,-.25,.29,0,.34,.32,.34);this.ball(g,color,.22,.34,0,.36,.34,.35);
  [-1,1].forEach(sign=>{this.ball(g,'#34445c',sign*.215,.04,.464,.049,sleep?.014:.068,.025);this.ball(g,'#efadc0',sign*.36,-.085,.426,.10,.038,.02);if(!sleep)this.ball(g,'#ffffff',sign*.215-.012,.061,.487,.013,.02,.009);});
  const smile=new THREE.EllipseCurve(0,-.064,.086,.06,Math.PI,Math.PI*2);const mouth=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smile.getPoints(18).map(p=>new THREE.Vector3(p.x,p.y,.49))),18,.012,5,false),this.mat('#34445c'));g.add(mouth);
  this.ball(g,color,-.25,-.49,.1,.20,.11,.24);this.ball(g,color,.25,-.49,.1,.20,.11,.24);
  return g;
 }
 private makeCloud(color:string,storm=false){const g=new THREE.Group();this.ball(g,color,0,0,0,1.45,.55,.75);this.ball(g,color,-.8,.3,0,.7,.6,.65);this.ball(g,color,.2,.5,0,.85,.73,.7);this.ball(g,color,.96,.16,0,.62,.52,.58);if(storm){[-1,1].forEach(s=>{this.ball(g,'#556589',s*.27,.2,.72,.065,.045,.025);this.ball(g,'#8395d4',s*.56,-.72,.2,.042,.23,.042);});this.ball(g,'#8395d4',0,-1.0,.2,.04,.22,.04);}return g;}
 private makeIsland(id:number){
  const p=ISLANDS[id],g=new THREE.Group();g.position.set(p.x,p.y,p.z);this.scene.add(g);this.islands.push(g);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(p.r,p.r*.96,.34,40),this.mat(p.color));cap.position.y=-.17;cap.receiveShadow=true;cap.castShadow=true;g.add(cap);
  const underside=new THREE.Mesh(new THREE.ConeGeometry(p.r*.96,1.95,8,2),this.mat(p.bottom));underside.rotation.z=Math.PI;underside.position.y=-1.22;underside.castShadow=true;g.add(underside);
  for(let k=0;k<8;k++){let a=k/8*Math.PI*2;this.ball(g,p.color,Math.cos(a)*p.r*.83,-.10,Math.sin(a)*p.r*.83,.38,.22,.4);}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(p.r+.17,.045,5,56),new THREE.MeshBasicMaterial({color:'#fffdf0',transparent:true,opacity:.0}));ring.rotation.x=Math.PI/2;ring.position.y=.09;g.add(ring);this.rings.push(ring);
  for(let k=0;k<5;k++){
   const a=k*2.37+id*.9,rad=p.r*.73,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
   const flower=new THREE.Group();flower.position.set(x,.01,z);
   const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.36,5),this.mat('#66a78b'));stem.position.y=.16;flower.add(stem);
   for(let j=0;j<5;j++){const t=j/5*Math.PI*2;this.ball(flower,id%2?'#fff7f2':'#fffbe5',Math.cos(t)*.1,.38,Math.sin(t)*.1,.079,.047,.079);}
   this.ball(flower,'#eec46b',0,.405,0,.061,.04,.061);g.add(flower);
  }
  const trees=new THREE.Group();trees.position.set(-p.r*.50,0,-p.r*.47);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.72,7),this.mat('#ba9f94'));trunk.position.y=.36;trees.add(trunk);
  this.ball(trees,id%2?'#f4d0d3':'#badfa9',0,1.05,0,.55,.66,.48);this.ball(trees,id%2?'#facfd1':'#aad69b',.3,.81,.13,.34,.40,.34);g.add(trees);
  if(id===0){this.ball(g,'#fff2db',.5,.2,-.2,.55,.2,.46);this.ball(g,'#e5b992',.5,.37,-.2,.25,.03,.26);}
  const starGroup=new THREE.Group();starGroup.position.y=.7;
  for(let k=0;k<(id===8?5:3);k++){const m=new THREE.Mesh(this.starGeo,this.mat('#ffd779'));m.position.set((k-1)*.42,.38+Math.sin(k)*.13,.25);m.rotation.y=.3;starGroup.add(m);}g.add(starGroup);this.stars.push(starGroup);starGroup.visible=id!==0;
  if('friend' in p){const f=this.critter(FRIENDS[p.friend].color,true);f.scale.setScalar(.72);f.position.set(.5,.49,.12);g.add(f);this.sleeping[p.friend]=f;starGroup.position.z=-.65;}
 }
 setMarkers(els:HTMLElement[]){this.markerEls=els;}
 setColor(color:string){this.player.traverse(o=>{if(o instanceof THREE.Mesh&&o.material===this.mat(this.playerColor))o.material=this.mat(color);});this.playerColor=color;}
 private emit(){this.hooks.update({...this.state,friends:[...this.state.friends],visited:[...this.state.visited]});}
 private tell(message:string,seconds=2.8){this.state.message=message;this.messageUntil=this.elapsed+seconds;this.emit();}
 start(){
  this.sound.unlock();this.sound.music(true);this.state={...INITIAL,phase:'playing',best:this.state.best,friends:[],visited:[0]};this.elapsed=0;this.lastLanding=0;this.hop=null;
  this.player.position.set(ISLANDS[0].x,.7,ISLANDS[0].z);this.stars.forEach((s,i)=>s.visible=i!==0);this.sleeping.forEach(s=>s.visible=true);this.followers.forEach(f=>f.visible=false);
  this.tell('Tap a glowing island. Let’s find your friends!',4);this.emit();
 }
 pause(){if(this.state.phase==='playing'){this.state.phase='paused';this.sound.music(false);}else if(this.state.phase==='paused'){this.state.phase='playing';this.sound.unlock();this.sound.music(true);}this.emit();}
 mute(muted:boolean){this.sound.enabled=!muted;}
 home(){this.hop=null;this.state={...INITIAL,best:this.state.best,friends:[],visited:[0]};this.player.position.set(0,.7,4);this.sound.music(false);this.followers.forEach(f=>f.visible=false);this.sleeping.forEach(f=>f.visible=true);this.stars.forEach((s,i)=>s.visible=i!==0);this.emit();}
 jump(target:number){
  if(this.state.phase!=='playing'||this.hop)return;
  if(!neighbours(this.state.island).includes(target))return;
  const p=ISLANDS[target];this.hop={from:this.player.position.clone(),to:new THREE.Vector3(p.x,p.y+.7,p.z),target,elapsed:0,duration:.78+Math.hypot(p.x-this.player.position.x,p.z-this.player.position.z)*.025,returning:false};
  this.state.hopping=true;this.state.selected=target;this.sound.hop();this.emit();
 }
 private burst(at:THREE.Vector3,colors:string[],count=16){
  for(let i=0;i<count;i++){const m=new THREE.Mesh(i%3?this.starGeo:this.sphere,this.mat(colors[i%colors.length]));const scale=i%3?.3:.07;m.scale.setScalar(scale);m.position.copy(at);this.scene.add(m);this.particles.push({mesh:m,velocity:new THREE.Vector3((Math.random()-.5)*4,2+Math.random()*3,(Math.random()-.5)*4),life:.75+Math.random()*.45,max:1.2});}
 }
 private landed(target:number){
  this.state.hopping=false;
  if(this.state.storm===target){this.sound.splash();this.state.combo=0;this.burst(this.player.position,['#a9ceec','#e1ecff'],14);const p=ISLANDS[this.state.island];this.hop={from:this.player.position.clone(),to:new THREE.Vector3(p.x,p.y+.7,p.z),target:this.state.island,elapsed:0,duration:.75,returning:true};this.state.hopping=true;this.tell('Too splashy! Try another island.');return;}
  this.state.island=target;this.state.combo=this.elapsed-this.lastLanding<3.5?Math.min(this.state.combo+1,5):1;this.lastLanding=this.elapsed;
  if(!this.state.visited.includes(target)){this.state.visited.push(target);this.stars[target].visible=false;const score=target===8?20:5;this.state.stars+=score*this.state.combo;this.sound.collect(this.state.combo);this.burst(this.player.position,['#ffdf86','#fff5bd','#ffffff']);if(target===8)this.tell('Jackpot! A whole sprinkle of stars.');else if(this.state.combo>=2)this.tell(`${this.state.combo}× happy hops! Keep it going.`,1.6);}
  const p=ISLANDS[target];
  if('friend' in p&&!this.state.friends.includes(p.friend)){this.state.friends.push(p.friend);this.sleeping[p.friend].visible=false;this.followers[p.friend].visible=true;this.state.stars+=25;this.sound.friend();this.burst(this.player.position,[FRIENDS[p.friend].color,'#ffffff','#ffe59e'],25);this.tell(this.state.friends.length===3?'The gang’s all here! Bring everyone HOME.':`${FRIENDS[p.friend].name} woke up! ${3-this.state.friends.length} friends to find.`,4);}
  this.state.selected=neighbours(target).find(i=>!this.state.visited.includes(i))??neighbours(target)[0];
  if(target===0&&this.state.friends.length===3)this.finish(true);else this.emit();
 }
 private finish(won:boolean){this.state.phase=won?'won':'over';this.state.hopping=false;this.hop=null;if(won){this.state.stars+=Math.ceil(this.state.time)*2;this.burst(this.player.position,['#ffc0d2','#ffdf8e','#b4e5cc','#cabbf4'],70);this.sound.win();}this.state.best=Math.max(this.state.best,this.state.stars);try{localStorage.setItem('cloudhop-best',String(this.state.best));}catch{}this.sound.music(false);this.emit();}
 private key=(e:KeyboardEvent)=>{
  if(e.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName))return;
  if(e.code==='Escape'||e.code==='KeyP'){this.pause();return;}
  if(this.state.phase!=='playing')return;
  const ns=neighbours(this.state.island);
  if(['ArrowRight','ArrowDown','KeyD','KeyS'].includes(e.code)){e.preventDefault();this.state.selected=ns[(ns.indexOf(this.state.selected)+1)%ns.length];this.emit();}
  if(['ArrowLeft','ArrowUp','KeyA','KeyW'].includes(e.code)){e.preventDefault();this.state.selected=ns[(ns.indexOf(this.state.selected)+ns.length-1)%ns.length];this.emit();}
  if(e.code==='Space'||e.code==='Enter'){e.preventDefault();this.jump(this.state.selected);}
 };
 private visibility=()=>{if(document.hidden&&this.state.phase==='playing')this.pause();};
 private contextLost=(e:Event)=>{e.preventDefault();this.hooks.error('The sky renderer paused. Reload to bring your clouds back.');};
 private resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);const size=Math.max(10.2,(w<650?8.25:11.7)/(w/h));this.scene.scale.x=w<650?.72:1;this.camera.top=size;this.camera.bottom=-size;this.camera.left=-size*w/h;this.camera.right=size*w/h;this.camera.updateProjectionMatrix();}
 private frame=(stamp:number)=>{
  if(this.disposed)return;const dt=Math.min((stamp-(this.lastFrame||stamp))/1000,.04);this.lastFrame=stamp;this.time+=dt;
  const playing=this.state.phase==='playing';
  if(playing){this.elapsed+=dt;this.state.time=Math.max(0,90-this.elapsed);if(this.state.time===0)this.finish(false);
   const cycle=Math.floor((this.elapsed-8)/6),seq=[2,6,5,1,8,3,4,7];this.state.storm=this.elapsed>8&&((this.elapsed-8)%6)>1.3?seq[(cycle+seq.length)%seq.length]:-1;
   if(this.state.message&&this.elapsed>this.messageUntil)this.state.message='';
  }
  if(this.hop&&playing){
   const h=this.hop;h.elapsed+=dt;const t=Math.min(h.elapsed/h.duration,1);this.player.position.lerpVectors(h.from,h.to,t);this.player.position.y+=Math.sin(Math.PI*t)*(this.reduced?1.3:2.4);const angle=Math.atan2(h.to.x-h.from.x,h.to.z-h.from.z);this.player.rotation.y=THREE.MathUtils.lerp(this.player.rotation.y,angle,.12);
   this.player.scale.set(1-.12*Math.sin(t*Math.PI),1+.15*Math.sin(t*Math.PI),1-.1*Math.sin(t*Math.PI));
   if(Math.floor(this.time*22)!==Math.floor((this.time-dt)*22)&&!this.reduced)this.burst(this.player.position.clone().add(new THREE.Vector3(0,-.35,0)),['#ffd4e4','#e5d9ff','#bfeae3'],1);
   if(t>=1){this.hop=null;this.player.scale.set(1.17,.77,1.12);if(h.returning){this.state.hopping=false;this.emit();}else this.landed(h.target);}
  }else if(this.state.phase!=='paused'){
   const p=ISLANDS[this.state.island];this.player.position.y=p.y+.69+Math.sin(this.time*2.8)*.07;
   this.player.scale.lerp(new THREE.Vector3(1,1,1),.10);const look=this.state.phase==='menu'?.5:.3;this.player.rotation.y=THREE.MathUtils.lerp(this.player.rotation.y,look,.05);
  }
  this.followers.forEach((f,i)=>{if(f.visible){const index=this.state.friends.indexOf(i),a=this.time*.8+index*Math.PI*2/3;const target=this.player.position.clone().add(new THREE.Vector3(Math.cos(a)*1.05,.35+Math.sin(this.time*3+i)*.12,Math.sin(a)*1.05));f.position.lerp(target,.1);f.rotation.y=.4;}});
  this.sleeping.forEach((f,i)=>f.scale.y=.72+Math.sin(this.time*1.8+i)*.025);
  const available=neighbours(this.state.island);
  this.rings.forEach((r,i)=>{const m=r.material as THREE.MeshBasicMaterial;const active=playing&&available.includes(i)&&!this.hop;m.opacity=active?(i===this.state.selected?.9:.48):i===0&&this.state.friends.length===3?.8:0;m.color.set(i===this.state.storm?'#ea97af':i===0&&this.state.friends.length===3?'#ffe086':'#fffdf0');r.scale.setScalar(1+Math.sin(this.time*3+i)*.014);});
  this.stars.forEach((g,i)=>{g.rotation.y=Math.sin(this.time*1.8+i)*.2;g.position.y=.7+Math.sin(this.time*2+i)*.10;});
  this.clouds.forEach((g,i)=>{g.position.x+=Math.sin(this.time*.08+i)*dt*.09;g.position.y+=Math.sin(this.time*.4+i)*dt*.045;});
  this.rain.visible=this.state.storm>=0&&playing;if(this.rain.visible){const p=ISLANDS[this.state.storm];this.rain.position.set(p.x,p.y+2.35+Math.sin(this.time*3)*.1,p.z);this.rain.scale.setScalar(.75);}
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.velocity.y-=dt*5;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.z+=dt*3;p.mesh.scale.multiplyScalar(1-dt*.9);if(p.life<=0){this.scene.remove(p.mesh);this.particles.splice(i,1);}}
  this.shadow.position.set(this.player.position.x,ISLANDS[this.state.island].y+.025,this.player.position.z);this.shadow.visible=!this.hop;
  this.rainbow.scale.setScalar(this.state.friends.length===3?1+Math.sin(this.time*2)*.035:1);
  const mobile=this.container.clientWidth<700;const desired=this.state.phase==='menu'?(mobile?new THREE.Vector3(0,4,-4):new THREE.Vector3(-3.9,1,-2.8)):new THREE.Vector3(0,1,-3.7);this.target.lerp(desired,dt*3);this.camera.position.copy(this.target).add(new THREE.Vector3(mobile?0:12,mobile?24:20,mobile?20:24));this.camera.lookAt(this.target);
  this.markerEls.forEach((el,i)=>{const p=ISLANDS[i],v=new THREE.Vector3(p.x*this.scene.scale.x,p.y+.18,p.z+1.35).project(this.camera);el.style.left=`${(v.x*.5+.5)*this.container.clientWidth}px`;el.style.top=`${(-v.y*.5+.5)*this.container.clientHeight}px`;});
  this.renderer.render(this.scene,this.camera);
  if(stamp-this.lastEmit>100&&playing){this.lastEmit=stamp;this.emit();}
  this.raf=requestAnimationFrame(this.frame);
 };
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();window.removeEventListener('keydown',this.key);document.removeEventListener('visibilitychange',this.visibility);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);this.sound.dispose();const geos=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();this.scene.traverse(o=>{if(o instanceof THREE.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());this.renderer.dispose();this.renderer.domElement.remove();}
}
