/* Genworq, Business Process Automation page.
   Timeline scroll progress, count-up figures, process ROI calculator, console clock.
   Everything degrades to the server-rendered values when JS is off. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- console clock ---------- */
(() => {
  const el = $('#bc-clock'); if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' · LIVE';
  };
  tick(); setInterval(tick, 30000);
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
