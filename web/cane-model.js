/* Dependency-free, depth-sorted 3D schematic. MPU axes: pitch X, yaw Y, roll Z.
   Sensor installation can require a different axis mapping; this matches the existing page. */
class CaneModel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.faces = [];
    this.pose = [0, 0, 0];
    this.target = [0, 0, 0];
    this.orbit = -0.42;
    this.elevation = -0.12;
    this.frame = null;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.build();
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D guide cane model. Drag or use the arrow keys to rotate. Press Home to reset the view.');
    let drag = null;
    canvas.addEventListener('pointerdown', e => {
      if (!e.isPrimary || e.button !== 0) return;
      drag = [e.clientX, e.clientY];
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      this.orbit += (e.clientX - drag[0]) * 0.009;
      this.elevation = Math.max(-0.8, Math.min(0.8, this.elevation + (e.clientY - drag[1]) * 0.006));
      drag = [e.clientX, e.clientY];
      this.requestDraw();
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { drag = null; });
    canvas.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'Home') this.resetView();
      else {
        if (e.key === 'ArrowLeft') this.orbit -= 0.12;
        if (e.key === 'ArrowRight') this.orbit += 0.12;
        if (e.key === 'ArrowUp') this.elevation = Math.max(-0.8, this.elevation - 0.08);
        if (e.key === 'ArrowDown') this.elevation = Math.min(0.8, this.elevation + 0.08);
        this.requestDraw();
      }
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }
  add(points, color) { this.faces.push({ points, color }); }
  cylinder(a, b, radius, color, segments = 16) {
    const d = b.map((v, i) => v - a[i]);
    const length = Math.hypot(...d);
    const n = d.map(v => v / length);
    const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const cross = (u, v) => [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const raw = cross(n, ref), u = raw.map(v => v / Math.hypot(...raw)), v = cross(n, u);
    const ring = center => Array.from({length:segments}, (_, i) => center.map((x, k) => x + radius * (Math.cos(i * 2*Math.PI/segments)*u[k] + Math.sin(i * 2*Math.PI/segments)*v[k])));
    const bottom = ring(a), top = ring(b);
    for (let i=0; i<segments; i++) {
      const j = (i+1)%segments;
      this.add([bottom[i],bottom[j],top[j],top[i]], color);
    }
    this.add(bottom.slice().reverse(), color);
    this.add(top, color);
  }
  box(center, size, color) {
    const [x,y,z] = center, [w,h,d] = size.map(v=>v/2);
    const points = [[x-w,y-h,z-d],[x+w,y-h,z-d],[x+w,y+h,z-d],[x-w,y+h,z-d],[x-w,y-h,z+d],[x+w,y-h,z+d],[x+w,y+h,z+d],[x-w,y+h,z+d]];
    for (const face of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]]) this.add(face.map(i=>points[i]),color);
  }
  sphere(center, radius, color) {
    const point = (i,j) => {
      const a = i*Math.PI/8, b=j*2*Math.PI/16;
      return [center[0]+radius*Math.sin(a)*Math.cos(b),center[1]+radius*Math.cos(a),center[2]+radius*Math.sin(a)*Math.sin(b)];
    };
    for (let i=0;i<8;i++) for(let j=0;j<16;j++) this.add([point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)],color);
  }
  build() {
    const white = [223,233,241], dark = [46,65,85], blue = [44,128,221], red = [224,86,79];
    // Long white shaft with red identification segment and metallic folding collars.
    this.cylinder([0,-1.63,0],[0,1.18,0],0.054,white);
    this.cylinder([0,-1.64,0],[0,-1.03,0],0.059,red);
    for (const y of [-1.02,-0.35,0.35,1.08]) this.cylinder([0,y-0.027,0],[0,y+0.027,0],0.065,[150,172,193]);
    // Rubber rolling tip.
    this.cylinder([0,-1.76,0],[0,-1.61,0],0.082,dark);
    this.sphere([0,-1.78,0],0.105,[214,224,233]);
    // Electronics enclosure mounted below the grip, with forward-facing ultrasound pair.
    this.box([0,0.91,0.035],[0.32,0.4,0.26],white);
    this.box([0,0.91,0.176],[0.29,0.28,0.025],blue);
    for(const x of [-0.077,0.077]) {
      this.cylinder([x,0.94,0.18],[x,0.94,0.225],0.063,[183,199,212]);
      this.cylinder([x,0.94,0.226],[x,0.94,0.231],0.045,dark);
      this.cylinder([x,0.94,0.232],[x,0.94,0.236],0.031,[105,127,147]);
    }
    this.box([0,0.81,0.193],[0.07,0.018,0.008],[99,239,201]);
    // Textured grip and gently curved handle.
    this.cylinder([0,1.15,0],[0,1.63,0],0.085,dark);
    for(let y=1.18;y<1.6;y+=0.065) this.cylinder([0,y,0],[0,y+0.014,0],0.09,[67,89,110]);
    this.cylinder([0,1.63,0],[0.04,1.72,0],0.085,dark);
    this.sphere([0.04,1.72,0],0.085,dark);
    this.cylinder([0.04,1.72,0],[0.22,1.75,0],0.085,dark);
    this.sphere([0.22,1.75,0],0.085,dark);
    this.cylinder([0.22,1.75,0],[0.35,1.67,0],0.085,dark);
    this.sphere([0.35,1.67,0],0.085,dark);
    this.cylinder([0,1.12,0],[0,1.16,0],0.088,blue);
    // Wrist strap loop, formed from thin segments to keep it legible from all angles.
    for(let i=0;i<24;i++) {
      const point = n => [0.16+0.135*Math.cos(n*Math.PI/12),1.32+0.23*Math.sin(n*Math.PI/12),-0.09];
      this.cylinder(point(i),point(i+1),0.016,[84,112,139],6);
    }
  }
  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(bounds.width * ratio);
    this.canvas.height = Math.round(bounds.height * ratio);
    this.ctx.setTransform(ratio,0,0,ratio,0,0);
    this.requestDraw();
  }
  setPose(pitch,roll,yaw) {
    if (![pitch,roll,yaw].every(Number.isFinite)) return;
    this.target = [pitch,yaw,roll].map(v=>v*Math.PI/180);
    if(this.reducedMotion.matches) this.pose = [...this.target];
    this.requestDraw();
  }
  resetView() { this.orbit=-0.42; this.elevation=-0.12; this.requestDraw(); }
  requestDraw() {
    if(this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      let moving = false;
      this.pose = this.pose.map((v,i) => {
        const delta = Math.atan2(Math.sin(this.target[i]-v),Math.cos(this.target[i]-v));
        if(Math.abs(delta)>0.001) moving = true;
        return v + delta * (this.reducedMotion.matches ? 1 : 0.28);
      });
      this.draw();
      if(moving) this.requestDraw();
    });
  }
  draw() {
    const ctx = this.ctx, w=this.width, h=this.height;
    if(!w || !h || !ctx) return;
    ctx.clearRect(0,0,w,h);
    const rotateX = ([x,y,z],a) => [x,y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
    const rotateY = ([x,y,z],a) => [x*Math.cos(a)+z*Math.sin(a),y,-x*Math.sin(a)+z*Math.cos(a)];
    const rotateZ = ([x,y,z],a) => [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z];
    const transform = p => rotateX(rotateY(rotateY(rotateX(rotateZ(p,this.pose[2]),this.pose[0]),this.pose[1]),this.orbit),this.elevation);
    const scale = Math.min(w/4.6,(h-82)/4.5);
    const project = ([x,y,z]) => {const factor=7/(7-z);return [w/2+x*scale*factor,h/2-y*scale*factor];};
    // Ground reference remains fixed while the sensor rotates the cane.
    ctx.save(); ctx.translate(w/2,h-54);ctx.scale(1,0.23);
    const halo=ctx.createRadialGradient(0,0,5,0,0,95);halo.addColorStop(0,'#83b6e944');halo.addColorStop(1,'#83b6e900');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,95,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#bdd8ef';ctx.lineWidth=2;for(const r of [60,90]) {ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}ctx.restore();
    const faces = this.faces.map(face => {
      const points = face.points.map(transform);
      return {points,color:face.color,depth:points.reduce((v,p)=>v+p[2],0)/points.length};
    }).sort((a,b)=>a.depth-b.depth);
    for(const face of faces) {
      const [a,b,c] = face.points;
      const u=b.map((v,i)=>v-a[i]),v=c.map((val,i)=>val-a[i]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const length=Math.hypot(...n);
      if(length<1e-8) continue;
      const light=0.72+0.28*Math.abs((n[0]*-0.4+n[1]*0.7+n[2]*0.6)/length);
      const color='rgb('+face.color.map(v=>Math.round(v*light)).join(',')+')';
      ctx.beginPath();face.points.forEach((p,i)=>{const [x,y]=project(p);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=0.45;ctx.stroke();
    }
    // A small fixed coordinate reference avoids confusing the viewing angle with sensor readings.
    const origin=[w-44,h-65];
    for(const [end,color,label] of [[[23,0],'#df756d','X'],[[0,-24],'#329a83','Y'],[[-14,12],'#4b8bce','Z']]) {
      ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(origin[0]+end[0],origin[1]+end[1]);ctx.stroke();ctx.fillStyle=color;ctx.font='10px sans-serif';ctx.fillText(label,origin[0]+end[0]+3,origin[1]+end[1]+3);
    }
  }
}
