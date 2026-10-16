/* Reference renderer only. Native source PNGs are never modified.
   This supports the supplied frame-region manifest; it is not a replacement
   for Pantheon Realms' existing horizontal-strip animation implementation. */
window.PantheonAtlas = class {
  constructor(canvas, manifest, base = '') {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.manifest = manifest; this.base = base; this.cache = new Map();
    this.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scale = 1; this.facing = 1; this.loopDemo = true;
    this.begin = performance.now(); this.stopped = false;
    this.tick = this.tick.bind(this); requestAnimationFrame(this.tick);
  }
  select(creature, state = 'idle') {
    this.creature = creature; this.state = state; this.begin = performance.now();
    this.lastFrame = 0;
  }
  animation() {
    const set = this.manifest.sets[this.creature];
    let a = set?.animations[this.state];
    const visited = new Set();
    while (a?.alias) {
      if (visited.has(a.alias)) throw new Error('Animation alias cycle');
      visited.add(a.alias); a = set.animations[a.alias];
    }
    return a;
  }
  tick(now) {
    if (this.stopped) return;
    const a = this.animation();
    if (a) {
      let image = this.cache.get(a.file);
      if (!image) { image = new Image(); image.src = this.base + a.file; this.cache.set(a.file, image); }
      const n = a.frames.length;
      const period = n / a.fps + (a.loop ? 0 : .9);
      const elapsed = (now - this.begin) / 1000;
      const seconds = a.loop || this.loopDemo ? elapsed % period : elapsed;
      let index = Math.min(n - 1, Math.floor(seconds * a.fps));
      if (this.paused) index = this.lastFrame || 0; else this.lastFrame = index;
      const f = a.frames[index];
      const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (image.complete && image.naturalWidth) {
        const s = (f.sourceScale || 1) * this.scale;
        ctx.save(); ctx.translate(w / 2, h - 28 - (a.stageLift || 0) * this.scale);
        ctx.scale(s * this.facing, s);
        ctx.drawImage(image, ...f.rect, -f.anchor[0], -f.anchor[1], f.rect[2], f.rect[3]);
        ctx.restore();
      }
      this.canvas.dataset.frame = String(index);
    }
    requestAnimationFrame(this.tick);
  }
  destroy() { this.stopped = true; }
};
