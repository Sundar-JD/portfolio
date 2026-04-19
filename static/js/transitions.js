(function(){
  // ── Inject styles ────────────────────────────────────────────────────────
  const S = document.createElement('style');
  S.textContent = `
    #pt-root { position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden; }

    #pt-canvas { position:absolute;inset:0;width:100%;height:100%; }

    #pt-cmd {
      position:absolute;left:50%;top:50%;
      transform:translate(-50%,-50%);
      font-family:'Courier New',monospace;
      font-size:clamp(14px,2vw,24px);
      color:#00ffff;
      letter-spacing:.12em;
      text-shadow:0 0 8px #00ffff,0 0 24px rgba(0,200,255,.6);
      opacity:0;
      pointer-events:none;
      white-space:nowrap;
    }

    .pt-content-enter {
      animation:ptEnter .7s cubic-bezier(.16,1,.3,1) both;
    }
    @keyframes ptEnter {
      from{opacity:0;transform:translateY(22px);filter:brightness(1.6);}
      to  {opacity:1;transform:translateY(0);  filter:brightness(1);}
    }
  `;
  document.head.appendChild(S);

  // ── DOM ──────────────────────────────────────────────────────────────────
  const root = document.createElement('div'); root.id='pt-root';
  const cv   = document.createElement('canvas'); cv.id='pt-canvas';
  const cmd  = document.createElement('div');    cmd.id='pt-cmd';
  root.appendChild(cv); root.appendChild(cmd);
  document.body.appendChild(root);

  const ctx = cv.getContext('2d');
  let W=0,H=0;
  function resize(){ W=cv.width=window.innerWidth; H=cv.height=window.innerHeight; }
  resize(); window.addEventListener('resize',resize);

  // ── State machine ────────────────────────────────────────────────────────
  // phase: 'idle' | 'closing' | 'holding' | 'opening'
  let phase='idle', phaseT=0, phaseLen=0;
  let href=null;
  let cmdText='';
  let cmdOpacity=0;

  const CLOSE_DUR  = 520;  // ms — wipe in
  const HOLD_DUR   = 180;  // ms — pause at full black
  const OPEN_DUR   = 560;  // ms — wipe out
  const CMD_FADEIN = 120;

  const phrases=['$ cd ../','$ exec route.sh','$ navigating...','$ sudo navigate','> Redirecting...','$ ssh jump','$ route --next','$ ./go.sh','$ cd /next'];

  // ── Canvas drawing ───────────────────────────────────────────────────────
  // We draw N horizontal bars that animate open/closed with staggered easing
  const BARS = 10;

  function easeInExpo(t){ return t===0?0:Math.pow(2,10*t-10); }
  function easeOutExpo(t){ return t===1?1:1-Math.pow(2,-10*t); }
  function easeInOutCubic(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }

  function lerp(a,b,t){ return a+(b-a)*t; }

  function drawBars(progress, opening){
    ctx.clearRect(0,0,W,H);
    const barH = H/BARS;

    for(let i=0;i<BARS;i++){
      // Stagger: each bar is delayed proportionally
      const stagger = i/(BARS-1);
      const delay   = 0.35;           // fraction of total used for stagger
      const local   = Math.max(0, Math.min(1, (progress - stagger*delay) / (1-delay)));
      const eased   = opening ? easeOutExpo(local) : easeInExpo(local);

      const y = i*barH;
      // alternate bars slide from left / right for a slick iris-like effect
      const fromLeft = i%2===0;
      const scaleX   = opening ? 1-eased : eased;

      ctx.save();
      ctx.fillStyle='#000';
      if(fromLeft){
        ctx.fillRect(0, y, W*scaleX, barH+1);
      } else {
        ctx.fillRect(W*(1-scaleX), y, W*scaleX, barH+1);
      }

      // Glowing edge on leading bar edge
      if(scaleX>0.01 && scaleX<0.99){
        const edgeX = fromLeft ? W*scaleX : W*(1-scaleX);
        const grad = ctx.createLinearGradient(
          edgeX-(fromLeft?12:0), 0,
          edgeX+(fromLeft?0:12), 0
        );
        grad.addColorStop(0,`rgba(0,255,255,${fromLeft?0:0.7})`);
        grad.addColorStop(1,`rgba(0,255,255,${fromLeft?0.7:0})`);
        ctx.fillStyle=grad;
        ctx.fillRect(fromLeft?edgeX-14:edgeX, y, 14, barH+1);
      }

      ctx.restore();
    }

    // Subtle scanline across full canvas
    const scanY = ((Date.now()%1800)/1800)*H;
    const sg = ctx.createLinearGradient(0,scanY-40,0,scanY+2);
    sg.addColorStop(0,'rgba(0,255,255,0)');
    sg.addColorStop(1,'rgba(0,255,255,0.06)');
    ctx.fillStyle=sg;
    ctx.fillRect(0,scanY-40,W,42);
  }

  // ── Animation loop ───────────────────────────────────────────────────────
  let lastTs = 0;
  function frame(ts){
    requestAnimationFrame(frame);
    const dt = ts-lastTs; lastTs=ts;

    if(phase==='idle'){ ctx.clearRect(0,0,W,H); return; }

    phaseT += dt;
    const p = Math.min(phaseT/phaseLen, 1);

    if(phase==='closing'){
      drawBars(p, false);
      // fade in command text in second half
      if(p>.5){
        cmdOpacity = Math.min((p-.5)/.35, 1);
        cmd.style.opacity = cmdOpacity;
        if(!cmd.textContent) cmd.textContent = cmdText;
      }
      if(p>=1){ phase='holding'; phaseT=0; phaseLen=HOLD_DUR; }
    }

    if(phase==='holding'){
      drawBars(1, false);
      if(p>.4 && href){ const h=href; href=null; window.location.href=h; }
    }

    if(phase==='opening'){
      drawBars(p, true);
      cmdOpacity = Math.max(0, 1-p*3);
      cmd.style.opacity = cmdOpacity;
      if(p>=1){
        phase='idle'; phaseT=0;
        cmd.textContent=''; cmd.style.opacity=0;
        root.style.pointerEvents='none';
      }
    }
  }
  requestAnimationFrame(frame);

  // ── API ──────────────────────────────────────────────────────────────────
  function startClose(url){
    href=url;
    cmdText=phrases[Math.floor(Math.random()*phrases.length)];
    cmd.textContent=''; cmdOpacity=0; cmd.style.opacity=0;
    root.style.pointerEvents='all';
    phase='closing'; phaseT=0; phaseLen=CLOSE_DUR;
  }

  function startOpen(){
    phase='opening'; phaseT=0; phaseLen=OPEN_DUR;
    root.style.pointerEvents='all';
    cmd.textContent=''; cmd.style.opacity=0;
    // trigger content animation
    setTimeout(()=>{
      document.querySelectorAll('.terminal').forEach(el=>{
        el.classList.remove('pt-content-enter');
        void el.offsetWidth; // reflow
        el.classList.add('pt-content-enter');
      });
      root.style.pointerEvents='none';
    }, OPEN_DUR*0.35);
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded',()=>{
    // draw bars closed, then open
    phase='opening'; phaseT=0; phaseLen=OPEN_DUR+80;

    document.querySelectorAll('nav a').forEach(link=>{
      link.addEventListener('click',function(e){
        e.preventDefault();
        const url=this.getAttribute('href');
        if(url && url!==window.location.pathname) startClose(url);
      });
    });
  });

  window.addEventListener('pageshow',e=>{ if(e.persisted) startOpen(); });
})();
