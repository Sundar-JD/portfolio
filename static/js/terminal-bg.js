(function () {
  // Single canvas — floating Linux command particles only, no grid lines
  const cv = document.createElement('canvas');
  cv.id = 'terminal-bg';
  Object.assign(cv.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    zIndex: '-1', pointerEvents: 'none',
  });
  document.body.appendChild(cv);

  const ctx = cv.getContext('2d');
  let W = cv.width  = window.innerWidth;
  let H = cv.height = window.innerHeight;

  window.addEventListener('resize', () => {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  });

  const cmds = [
    '$ sudo apt upgrade -y',
    '$ git push origin main',
    '$ docker build -t app .',
    '$ kubectl get pods -A',
    '$ systemctl restart nginx',
    '$ ssh ubuntu@10.0.0.1',
    '$ vim /etc/nginx/nginx.conf',
    '$ ./deploy.sh --prod',
    '$ htop',
    '$ journalctl -f -u app',
    '$ terraform apply',
    '$ ansible-playbook site.yml',
    '$ helm upgrade myapp ./chart',
    '$ netstat -tulnp',
    '$ git clone https://github.com/sundarj',
    '$ docker-compose up -d',
    '$ chmod +x setup.sh',
    '$ cat /var/log/syslog',
    '> Build: PASSED ✓',
    '> Deploying v2.1.4...',
    '> All systems operational',
    '[OK] nginx running',
    '[INFO] Container started',
    'FROM ubuntu:22.04',
    'RUN pip install -r requirements.txt',
    'EXPOSE 8080',
    'root@sundar:~/devops#',
    'sundar@k8s-node:~$',
    '$ ps aux | grep python',
    '$ df -h',
    '$ free -m',
    '$ ping 8.8.8.8',
    '$ traceroute google.com',
    '$ export NODE_ENV=production',
    '$ source ~/.bashrc',
    'namespace: production',
    '0/1 Running → 1/1 Running',
  ];

  // smooth ease-in-out sine
  function eio(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  class Particle {
    constructor(initial) { this.spawn(initial); }

    spawn(initial) {
      this.text  = cmds[Math.floor(Math.random() * cmds.length)];
      this.depth = 0.25 + Math.random() * 0.75;          // 0=far, 1=near
      this.x     = (Math.random() * 1.4 - 0.2) * W;
      this.y     = initial ? Math.random() * H : H + 30; // scatter on load
      this.vy    = (0.18 + Math.random() * 0.38) * this.depth; // rise speed
      this.vx    = (Math.random() - 0.5) * 0.06 * this.depth;  // slight drift
      this.fs    = 10 + this.depth * 8;                  // near = bigger
      this.life  = initial ? Math.random() : 0;
      this.ls    = 0.0006 + Math.random() * 0.0013;      // life speed
      this.peak  = 0.12 + this.depth * 0.32;             // max opacity

      // Color: mostly cyan, some green, rare amber
      const r = Math.random();
      if (r < 0.65)      { this.R=0;   this.G=255; this.B=255; } // cyan
      else if (r < 0.88) { this.R=0;   this.G=255; this.B=110; } // green
      else               { this.R=255; this.G=185; this.B=0;   } // amber
    }

    // bell-curve opacity: fade in → hold → fade out
    alpha() {
      const t = this.life;
      if (t < 0.20) return eio(t / 0.20) * this.peak;
      if (t < 0.70) return this.peak;
      return eio(1 - (t - 0.70) / 0.30) * this.peak;
    }

    update() {
      this.x   += this.vx;
      this.y   -= this.vy;
      this.life += this.ls;
      if (this.life >= 1 || this.y < -30) this.spawn(false);
    }

    draw() {
      const a = this.alpha();
      if (a < 0.005) return;
      ctx.save();
      ctx.font        = `${Math.round(this.fs)}px 'Courier New', monospace`;
      ctx.fillStyle   = `rgba(${this.R},${this.G},${this.B},${a})`;
      ctx.shadowColor = `rgba(${this.R},${this.G},${this.B},${(a * 0.5).toFixed(3)})`;
      ctx.shadowBlur  = 4 + this.depth * 10;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // 55 particles — dense enough to feel alive, not cluttered
  const particles = Array.from({ length: 55 }, (_, i) => new Particle(true));

  function frame() {
    requestAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
  }

  requestAnimationFrame(frame);
})();
