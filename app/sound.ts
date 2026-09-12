export class CloudSound {
 private ctx:AudioContext|null=null;
 enabled=true;
 private interval:ReturnType<typeof setInterval>|null=null;
 private step=0;
 unlock(){this.ctx??=new AudioContext();void this.ctx.resume();}
 private note(f:number,at=0,length=.3,vol=.045,type:OscillatorType='sine'){
  if(!this.enabled||!this.ctx)return;
  const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+at;
  o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+length+.02);
 }
 hop(){this.note(349,0,.13,.025);this.note(523,.08,.2,.02);}
 collect(combo:number){this.note(659+combo*15,0,.25);this.note(880+combo*10,.08,.3);}
 friend(){[523,659,784,1047].forEach((n,i)=>this.note(n,i*.12,.35,.04));}
 splash(){[230,180,130].forEach((n,i)=>this.note(n,i*.06,.16,.05,'triangle'));}
 win(){[523,659,784,1047,784,1047,1319].forEach((n,i)=>this.note(n,i*.14,.5,.045));}
 music(on:boolean){
  if(this.interval){clearInterval(this.interval);this.interval=null;}
  if(!on)return;
  const tune=[523,0,659,784,0,659,587,0,440,0,523,659,0,587,523,0];
  this.interval=setInterval(()=>{const n=tune[this.step++%tune.length];if(n)this.note(n,0,.65,.01);if(this.step%4===0)this.note([131,147,165,131][Math.floor(this.step/4)%4],0,1.2,.016,'triangle');},330);
 }
 dispose(){this.music(false);void this.ctx?.close();}
}
