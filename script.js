document.addEventListener('DOMContentLoaded', function () {

  /* Mobile menu toggle */
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', function () {
      this.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    document.querySelectorAll('.nav-menu a').forEach(function (link) {
      link.addEventListener('click', function () {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });

    document.addEventListener('click', function (event) {
      const insideNav = event.target.closest('.header-nav');
      if (!insideNav && navMenu.classList.contains('active')) {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  }

  /* Header shadow on scroll */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.style.boxShadow = window.pageYOffset > 4
        ? '0 4px 20px rgba(0,0,0,0.25)'
        : 'none';
    });
  }

  /* Reveal-on-scroll */
  const revealTargets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    revealTargets.forEach(function (el) { observer.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* Code tabs */
  const tabs = document.querySelectorAll('.code-tab');
  const panels = document.querySelectorAll('.code-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  /* Hero network canvas animation */
  const canvas = document.getElementById('network-canvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const nodeCount = 9;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00025,
        vy: (Math.random() - 0.5) * 0.00025,
        r: 4 + Math.random() * 4,
        entangled: i < 2
      });
    }

    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push([i, j]);
      }
    }

    const pulses = [0, 1, 2].map(function (i) {
      return { edge: i % edges.length, t: Math.random() };
    });

    function step(dt) {
      nodes.forEach(function (n) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0.06 || n.x > 0.94) n.vx *= -1;
        if (n.y < 0.08 || n.y > 0.92) n.vy *= -1;
        n.x = Math.min(0.94, Math.max(0.06, n.x));
        n.y = Math.min(0.92, Math.max(0.08, n.y));
      });
      pulses.forEach(function (p) { p.t += dt * 0.00035; if (p.t > 1) { p.t = 0; p.edge = Math.floor(Math.random() * edges.length); } });
    }

    function dist(a, b) {
      return Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);

      // edges (only nearby ones, faint)
      const maxLink = Math.min(w, h) * 0.42;
      ctx.lineWidth = 1;
      edges.forEach(function (e) {
        const a = nodes[e[0]], b = nodes[e[1]];
        const d = dist(a, b);
        if (d < maxLink) {
          const alpha = 0.16 * (1 - d / maxLink);
          ctx.strokeStyle = 'rgba(143,164,255,' + alpha + ')';
          ctx.beginPath();
          ctx.moveTo(a.x * w, a.y * h);
          ctx.lineTo(b.x * w, b.y * h);
          ctx.stroke();
        }
      });

      // traveling pulses
      pulses.forEach(function (p) {
        const e = edges[p.edge];
        const a = nodes[e[0]], b = nodes[e[1]];
        const d = dist(a, b);
        if (d > maxLink) return;
        const x = (a.x + (b.x - a.x) * p.t) * w;
        const y = (a.y + (b.y - a.y) * p.t) * h;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 7);
        grad.addColorStop(0, 'rgba(124,92,255,0.9)');
        grad.addColorStop(1, 'rgba(124,92,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      });

      // nodes
      const glow = 0.65 + 0.35 * Math.sin(time * 0.002);
      nodes.forEach(function (n) {
        const x = n.x * w, y = n.y * h;
        const isEnt = n.entangled;
        const pulse = isEnt ? glow : 1;
        ctx.beginPath();
        ctx.fillStyle = isEnt ? 'rgba(124,92,255,' + (0.55 * pulse + 0.25) + ')' : 'rgba(20,24,40,0.9)';
        ctx.strokeStyle = isEnt ? 'rgba(124,92,255,0.9)' : 'rgba(143,164,255,0.85)';
        ctx.lineWidth = 1.6;
        ctx.arc(x, y, n.r * (isEnt ? pulse : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // faint link between the two entangled nodes regardless of distance
      const e0 = nodes[0], e1 = nodes[1];
      ctx.strokeStyle = 'rgba(124,92,255,' + (0.25 + 0.25 * glow) + ')';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(e0.x * w, e0.y * h);
      ctx.lineTo(e1.x * w, e1.y * h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    let last = 0;
    function loop(time) {
      const dt = last ? time - last : 16;
      last = time;
      step(dt);
      draw(time);
      requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      draw(0);
    } else {
      requestAnimationFrame(loop);
    }
  }
});
