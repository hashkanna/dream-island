type Postcard = {src:string;mission:string};
export type RecordingState = {photos:Postcard[];action:string;notice:string;wish:string;seconds:number;draft:string};

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
   const s=state();c.fillStyle='#f7f5ef';c.fillRect(0,0,1920,1080);
   text('dream island',64,80,43,'#74617d',true);text('A TINY PHOTO SAFARI',66,112,13,'#b09caf');
   text('WANDER. MAKE A WISH. COLLECT THREE LITTLE WONDERS.',950,83,17,'#ad99b1');
   c.save();c.beginPath();c.roundRect(60,155,1420,800,28);c.clip();
   if(video.videoWidth&&video.readyState>=2)c.drawImage(video,60,155,1420,800);c.restore();
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
   const label=s.photos.length===3?'Three little wonders. Your album is complete!':s.notice||s.action||'Follow your curiosity. Find a view that makes you smile.';
   rect(180,860,1180,59,24,'#fff8edee');text(label.slice(0,88),210,898,22,'#9f84a4');
   if(s.draft){const im=picture(s.draft);rect(483,325,570,399,14,'#fffdf5');if(im.complete)c.drawImage(im,500,342,536,302);text('What made you smile?',612,690,28,'#9c80a5',true);}
   text('↑ WANDER    ↶ LOOK LEFT    ↷ LOOK RIGHT    ▣ SNAP A WONDER',72,1018,19,'#a08aa9');
   const wishes:Record<string,string>={stars:'Star shower',flowers:'Giant flowers',bubbles:'Bubble party'};
   text(s.wish?`Wish sent: ${wishes[s.wish]}`:'A little magic is one wish away.',1150,1018,20,'#b397bd');
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
