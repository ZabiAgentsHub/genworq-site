/* Genworq, Business Process Automation page.
   Timeline scroll progress, count-up figures, process ROI calculator, console clock.
   Everything degrades to the server-rendered values when JS is off. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- hero: scroll drives the photograph → copy hand-over ----------
   p = how far the sticky stage has been scrolled (0 at the top, 1 when the section
   releases). The sharp photograph is the resting state; a pre-blurred copy fades in
   over it and a light scrim rises, while the copy lines arrive one after another. */
(() => {
  const hero = $('#hero'), stage = $('.bh-stage', hero || document); if (!hero || !stage || RM.matches) return;
  const lines = $$('.bh-copy > *', hero);
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const span = (p, a, b) => ease(clamp((p - a) / (b - a), 0, 1));
  hero.classList.add('scrub');
  let ticking = false;
  const paint = () => {
    ticking = false;
    const r = hero.getBoundingClientRect();
    const nav = parseFloat(getComputedStyle(document.body).paddingTop) || 80; // fixed nav height
    hero.style.setProperty('--navh', nav + 'px');
    const travel = Math.max(1, r.height - (window.innerHeight - nav));
    const p = clamp((nav - r.top) / travel, 0, 1);
    const s = stage.style;
    s.setProperty('--soft', span(p, .08, .55).toFixed(3));
    s.setProperty('--scrim', span(p, .10, .60).toFixed(3));
    s.setProperty('--scale', (1 + span(p, 0, 1) * .06).toFixed(4));
    s.setProperty('--rest', (1 - span(p, 0, .22)).toFixed(3));
    lines.forEach((el, i) => {
      const a = .22 + i * .09;
      el.style.setProperty('--t', span(p, a, a + .28).toFixed(3));
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paint();

  /* Ambient motion layer. The still is the LCP and is already painted; the mp4 is only
     fetched on wide screens, after the page is idle, never on data-saver, and it pauses
     once the copy has taken over (p > .6) so it costs nothing further down the page. */
  const vid = $('.bh-video', hero);
  const conn = navigator.connection || {};
  if (vid && matchMedia('(min-width: 900px)').matches && !conn.saveData && !/2g/.test(conn.effectiveType || '')) {
    const start = () => {
      vid.src = vid.dataset.src;
      vid.addEventListener('canplay', () => { vid.classList.add('on'); vid.play().catch(() => {}); }, { once: true });
      vid.load();
      let playing = true;
      addEventListener('scroll', () => {
        const r = hero.getBoundingClientRect();
        const past = (nav0 - r.top) / Math.max(1, r.height - (window.innerHeight - nav0)) > .6;
        if (past && playing) { vid.pause(); playing = false; } else if (!past && !playing) { vid.play().catch(() => {}); playing = true; }
      }, { passive: true });
    };
    const nav0 = parseFloat(getComputedStyle(document.body).paddingTop) || 80;
    ('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 1200);
  }
})();

/* ---------- rollout timeline: spine fill + active node ---------- */
(() => {
  const line = $('#tline'); if (!line) return;
  const steps = $$('.tstep', line);
  let ticking = false;
  const paint = () => {
    ticking = false;
    const r = line.getBoundingClientRect();
    const anchor = window.innerHeight * 0.62;
    const p = clamp((anchor - r.top) / Math.max(1, r.height), 0, 1);
    line.style.setProperty('--p', p.toFixed(3));
    steps.forEach(s => {
      const b = s.getBoundingClientRect();
      s.classList.toggle('on', b.top + b.height * 0.5 < anchor);
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  paint();
})();

/* ---------- count-up figures ---------- */
(() => {
  const nums = $$('[data-count]'); if (!nums.length) return;
  const fmt = (n, dec) => n.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const run = el => {
    const to = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    if (RM.matches) { el.textContent = pre + fmt(to, dec) + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const k = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = pre + fmt(to * e, dec) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.4 });
  nums.forEach(n => io.observe(n));
})();

/* ---------- process ROI calculator ---------- */
(() => {
  const slider = $('#roi-hours'); if (!slider) return;
  const HOURLY = 37.5, WEEKS = 46, SHARE = 0.7; // stated in the note under the card
  const out = { h: $('#roi-h'), year: $('#roi-year'), money: $('#roi-money') };
  const nf = n => Math.round(n).toLocaleString('en-GB');
  const paint = () => {
    const h = +slider.value;
    const pct = ((h - +slider.min) / (+slider.max - +slider.min)) * 100;
    slider.style.setProperty('--pct', pct.toFixed(1) + '%');
    slider.setAttribute('aria-valuenow', String(h));
    const saved = h * WEEKS * SHARE;
    out.h.textContent = h;
    out.year.textContent = nf(saved) + ' h';
    out.money.textContent = '€' + nf(saved * HOURLY);
  };
  slider.addEventListener('input', paint);
  paint();
})();
})();
