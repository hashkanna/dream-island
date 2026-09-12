export class DreamSound {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private master: GainNode | null = null;
  private capture: MediaStreamAudioDestinationNode | null = null;
  private audible = true;
  get enabled() { return this.audible; }
  set enabled(value: boolean) { this.audible = value; if(this.master&&this.ctx)this.master.gain.setTargetAtTime(value?1:0,this.ctx.currentTime,.03); }

  unlock() {
    if(!this.ctx){
      this.ctx = new AudioContext(); this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      this.capture = this.ctx.createMediaStreamDestination();
      this.master.connect(this.ctx.destination); this.master.connect(this.capture);
    }
    void this.ctx.resume();
  }
  recordingTrack() { return this.capture?.stream.getAudioTracks()[0]; }

  private note(hz: number, delay = 0, duration = .8, volume = .025, type: OscillatorType = 'sine') {
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = hz;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + duration);
    o.connect(g); g.connect(this.master!); o.start(t); o.stop(t + duration + .03);
  }

  music(on: boolean) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (!on) return;
    // A small original pentatonic music-box loop, with a soft plucked bass.
    const melody = [659, 0, 784, 988, 0, 784, 659, 0, 587, 0, 659, 784, 0, 659, 523, 0,
      440, 0, 523, 659, 0, 784, 659, 0, 587, 0, 523, 440, 0, 523, 587, 0];
    this.timer = setInterval(() => {
      const step = this.step++ % melody.length;
      if (melody[step]) {
        this.note(melody[step], 0, 1.1, .014);
        this.note(melody[step] * 2, .015, .35, .002);
      }
      if (step % 8 === 0) {
        const root = [131, 147, 110, 131][Math.floor(step / 8)];
        this.note(root, 0, 2.6, .016, 'triangle');
        this.note(root * 3, .2, 2.1, .006);
      }
    }, 370);
  }

  shutter() { this.note(1800, 0, .045, .012, 'triangle'); this.note(900, .065, .07, .015, 'triangle'); }
  collect() { [659, 784, 1047].forEach((n, i) => this.note(n, i * .09, .55, .035)); }
  wish() { [523, 659, 784, 988, 1319].forEach((n, i) => this.note(n, i * .1, 1.15, .028)); }
  welcome() { [523, 659, 784].forEach((n, i) => this.note(n, i * .18, 1.2, .025)); }
  win() { [523, 659, 784, 1047, 988, 784, 1319].forEach((n, i) => this.note(n, i * .14, .9, .035)); }
  dispose() { this.music(false); void this.ctx?.close(); }
}
