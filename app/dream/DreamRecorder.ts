type Postcard = {src:string;mission:string};
export type InputCue = {id:string;label:string;source:'mouse'|'keyboard';at:number};
export type RecordingState = {photos:Postcard[];action:string;notice:string;wish:string;seconds:number;draft:string;input:InputCue|null};

// Captures the real received world video, app audio, and live gameplay state.
// The recording uses a fixed composition so it remains legible on a projector.
export class DreamRecorder {
 private recorder:MediaRecorder|null=null;
 private frame=0;
 private images=new Map<string,HTMLImageElement>();
 start(video:HTMLVideoElement,audio:MediaStreamTrack|undefined,state:()=>RecordingState,onReady:(blob:Blob)=>void){
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
  const c=canvas.getContext('2d')!;
  const picture=(src:string)=>{let im=this.images.get(src);if(!im){im=new Image();im.src=src;this.images.set(src,im);}return im;};
  const rect=(x:number,y:number,w:number,h:number,r:number,fill:string)=>{c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
  const text=(s:string,x:number,y:number,size:number,colour='#776383',bold=false)=>{c.font=`${bold?'bold ':''}${size}px Trebuchet MS`;c.fillStyle=colour;c.fillText(s,x,y);};
  const draw=()=>{
   const s=state(),age=s.input?performance.now()-s.input.at:Infinity,recent=age<4500;
   c.fillStyle='#f7f5ef';c.fillRect(0,0,1920,1080);
   text('dream island',64,80,43,'#74617d',true);text('A TINY PHOTO SAFARI',66,112,13,'#b09caf');
   text('WANDER. MAKE A WISH. COLLECT THREE LITTLE WONDERS.',950,83,17,'#ad99b1');
   c.save();c.beginPath();c.roundRect(60,155,1420,730,28);c.clip();
   if(video.videoWidth&&video.readyState>=2){const sh=video.videoWidth*730/1420;c.drawImage(video,0,(video.videoHeight-sh)/2,video.videoWidth,sh,60,155,1420,730);}c.restore();
   rect(87,181,214,38,19,'#fffaf0eb');text('●  LIVE WORLD MODEL',105,207,16,'#95a38c',true);
   rect(1272,181,178,38,19,'#fffaf0eb');text(`${Math.floor(s.seconds/60)}:${String(s.seconds%60).padStart(2,'0')} to wander`,1290,207,16,'#9d879e');
   rect(1520,155,342,800,25,'#eeebef');text('YOUR POCKET OF WONDERS',1549,196,13,'#ad99b1');
   text('A little souvenir.',1549,234,29,'#85708d',true);
   const missions=[['friend','A tiny friend','♡'],['view','A dreamy view','❀'],['magic','A little magic','✦']];
   missions.forEach(([id,title,icon],i)=>{
    const y=266+i*202,p=s.photos.find(p=>p.mission===id);rect(1541,y,300,187,9,'#fffdf7');
    if(p){const im=picture(p.src);if(im.complete)c.drawImage(im,1551,y+10,280,130);}else{rect(1551,y+10,280,130,6,['#f2d3dd','#d5e7d7','#e6dcf2'][i]);text(icon,1663,y+94,55,'#bb9ac4');}
    text(`${p?'✓  ':''}${title}`,1561,y+166,20,'#9e83a8',true);
   });
   text(`${s.photos.length} / 3 little wonders collected`,1549,915,17,'#a88bb0');
   const label=recent&&s.input?`${s.input.source==='mouse'?'CLICK':'KEY'}  ·  ${s.input.label}`:s.action||(s.photos.length===3?'Three little wonders. Your album is complete!':s.notice||'Choose a direction. Watch the garden dream the next view.');
   rect(125,794,1290,61,23,recent?'#6f4e88f5':'#fff8edee');text(label.slice(0,88),155,834,25,recent?'#ffffff':'#8b6f99',recent);
   const buttons=[['left','↶  LOOK LEFT',60,912,235],['forward','↑  WANDER',311,912,235],['right','↷  LOOK RIGHT',562,912,235],['back','↓  BACK',813,912,210],['photo','▣  SNAP A WONDER',1040,912,440],['stars','✦  Star shower',60,992,460],['flowers','❀  Giant flowers',540,992,460],['bubbles','○  Bubble party',1020,992,460]] as const;
   let pointer:[number,number]|null=null;
   buttons.forEach(([id,title,x,y,w])=>{const clicked=recent&&s.input?.id===id,held=!!s.action&&s.input?.id===id;rect(x,y,w,61,18,clicked||held?'#ad81c4':'#e9dfed');text(title,x+24,y+40,22,clicked||held?'#fff':'#8f739d',true);if(clicked)pointer=[x+w-50,y+29];});
   if(s.draft){const im=picture(s.draft);rect(433,283,670,451,18,'#fffdf5');if(im.complete)c.drawImage(im,450,300,636,330);text('What made you smile?',605,672,28,'#9c80a5',true);missions.forEach(([id,title],i)=>{rect(450+i*213,690,203,32,10,'#e9dfed');text(title,463+i*213,712,17,'#8f739d',true);});}
   if(recent&&s.input){const i=missions.findIndex(([id])=>id===s.input?.id);if(i>=0)pointer=[1793,266+i*202+164];}
   // A cue for the actual input event, mapped to this recording's control layout.
   // This is deliberately not presented as a desktop cursor capture.
   if(pointer&&s.input?.source==='mouse'){
    const [x,y]=pointer,pulse=(age%850)/850;c.save();c.globalAlpha=1-pulse*.65;c.strokeStyle='#e983b7';c.lineWidth=5;c.beginPath();c.arc(x,y,14+pulse*31,0,Math.PI*2);c.stroke();c.restore();
    c.save();c.translate(x,y);c.beginPath();c.moveTo(0,0);c.lineTo(4,41);c.lineTo(15,31);c.lineTo(24,49);c.lineTo(34,44);c.lineTo(24,27);c.lineTo(39,24);c.closePath();c.fillStyle='white';c.fill();c.strokeStyle='#765681';c.lineWidth=3;c.stroke();c.restore();
   }
   text('INPUT CUES FROM LIVE PLAY',1550,1001,14,'#ad99b1');text('World response takes a moment.',1550,1028,16,'#ad99b1');
   this.frame=requestAnimationFrame(draw);
  };
  draw();const stream=canvas.captureStream(30);if(audio)stream.addTrack(audio.clone());
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
  this.recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:7000000,audioBitsPerSecond:128000});
  const chunks:Blob[]=[];this.recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  this.recorder.onstop=()=>{cancelAnimationFrame(this.frame);stream.getTracks().forEach(t=>t.stop());onReady(new Blob(chunks,{type:this.recorder?.mimeType||mime||'video/webm'}));this.images.clear();};
  this.recorder.start(1000);
 }
 stop(){if(this.recorder?.state==='recording')this.recorder.stop();}
}
