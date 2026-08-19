/* Genworq: scroll-scrubbed hero + ported Framer interactions. Plain JS, no deps. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const html = document.documentElement;

/* ---------- language ---------- */
function setLang(l) {
  html.setAttribute('data-lang', l); html.setAttribute('lang', l);
  try { localStorage.setItem('gw-lang', l); } catch (e) {}
  $$('[data-ph-en]').forEach(el => el.placeholder = el.getAttribute('data-ph-' + l));
  document.title = l === 'en' ? 'Genworq | AI Agents That Run Your Busywork, End to End' : 'Genworq | KI-Agenten, die Ihre Routinearbeit erledigen';
  buildTicker();
}
let lang = 'en';
try { lang = localStorage.getItem('gw-lang') || 'en'; } catch (e) {}
$('#langbtn').addEventListener('click', () => setLang(html.getAttribute('data-lang') === 'en' ? 'de' : 'en'));

/* ---------- nav ---------- */
const nav = $('#nav'), links = $('#navlinks'), burger = $('#burger');
let navSolid = false;
function navCheck() { const s = scrollY > 40; if (s !== navSolid) { navSolid = s; nav.classList.toggle('solid', s); } }
addEventListener('scroll', navCheck, { passive: true }); navCheck();
burger.addEventListener('click', () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
links.addEventListener('click', e => { if (e.target.closest('a')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); closeDD(); } });
const dds = $$('.dd');
function closeDD(except) { dds.forEach(d => { if (d !== except) { d.classList.remove('open'); d.querySelector('button').setAttribute('aria-expanded', 'false'); } }); }
dds.forEach(d => {
  const b = d.querySelector('button');
  b.addEventListener('click', e => { e.stopPropagation(); const o = !d.classList.contains('open'); closeDD(d); d.classList.toggle('open', o); b.setAttribute('aria-expanded', String(o)); });
  if (matchMedia('(hover:hover)').matches) {
    let t; d.addEventListener('mouseenter', () => { clearTimeout(t); t = setTimeout(() => { closeDD(d); d.classList.add('open'); b.setAttribute('aria-expanded', 'true'); }, 120); });
    d.addEventListener('mouseleave', () => { clearTimeout(t); t = setTimeout(() => { d.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }, 200); });
  }
});
document.addEventListener('click', () => closeDD());
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDD(); });
document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

/* ---------- split text (seeded) ---------- */
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function splitSpan(span, mode, seed) {
  const text = span.textContent.trim(); const r = rng(seed);
  const words = text.split(/\s+/); const total = text.replace(/\s/g, '').length; let ci = 0;
  const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
  const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
  words.forEach((wd, wi) => {
    const w = document.createElement('span'); w.className = 'w';
    w.style.setProperty('--th', (wi / words.length * 0.58 + r() * 0.03).toFixed(3));
    if (mode === 'chars') {
      [...wd].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; c.style.setProperty('--th', (ci / total * 0.55 + r() * 0.06).toFixed(3)); c.style.setProperty('--jx', (-(10 + r() * 14)).toFixed(1) + 'px'); w.appendChild(c); ci++; });
    } else w.textContent = wd;
    vis.appendChild(w); if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
  });
  span.textContent = ''; span.appendChild(sr); span.appendChild(vis);
}
$$('.hero .split').forEach((el, i) => { const ent = el.closest('.band').dataset.ent; const mode = 'words'; $$(':scope > .de, :scope > .en', el).forEach((s, j) => splitSpan(s, mode, 1000 + i * 10 + j)); });

/* ---------- hero scrub ---------- */
const hero = $('#hero'), stage = $('#stage'), video = $('#hero-video'), poster = $('#poster'), ring = $('.ring');
/* all-intra encodes (every frame a keyframe) so scroll seeks land instantly; phones get the 960px cut */
const SMALL = matchMedia('(max-width: 720px)').matches;
const VIDEO_URL = SMALL ? 'assets/hero-scrub-m.mp4' : 'assets/hero-scrub.mp4', VIDEO_BYTES = SMALL ? 2320657 : 7718298;
/* phones: draw a pre-extracted frame sequence to a canvas in the same rAF as the captions (no video seek latency -> frame and text stay locked) */
const FRAMES_MODE = SMALL, FRAME_N = 73, FRAME_URL = i => 'assets/frames/f' + String(i + 1).padStart(3, '0') + '.webp';
const frames = new Array(FRAME_N).fill(null); let framesLoaded = 0, framesReady = false, canvas = null, ctx = null, lastFrame = -1, cw = 0, ch = 0;
function drawFrame(i) {
  if (!framesReady || !ctx) return; i = clamp(Math.round(i), 0, FRAME_N - 1);
  let img = frames[i]; if (!img) { for (let d = 1; d < FRAME_N && !img; d++) img = frames[i - d] || frames[i + d]; if (!img) return; }
  if (i === lastFrame) return; lastFrame = i;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; const s = Math.max(cw / iw, ch / ih); const sw = cw / s, sh = ch / s;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
}
function sizeCanvas() { if (!canvas) return; const dpr = Math.min(devicePixelRatio || 1, 1.5); const r = stage.getBoundingClientRect(); cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr); canvas.width = cw; canvas.height = ch; lastFrame = -1; drawFrame(shown * (FRAME_N - 1)); }
function loadFrames() {
  canvas = document.createElement('canvas'); canvas.id = 'hero-canvas'; canvas.setAttribute('aria-hidden', 'true'); video.after(canvas); ctx = canvas.getContext('2d', { alpha: false }); sizeCanvas();
  addEventListener('resize', sizeCanvas); addEventListener('orientationchange', () => setTimeout(sizeCanvas, 300));
  let next = 0, done = 0, failed = 0; const CONC = 6;
  const worker = () => { if (next >= FRAME_N) return; const i = next++; const img = new Image(); img.decoding = 'async';
    img.onload = () => { frames[i] = img; done++; framesLoaded = done; ring.style.setProperty('--ld', Math.round(126 * (1 - done / FRAME_N))); if (done + failed === FRAME_N) finish(); else worker(); };
    img.onerror = () => { failed++; if (failed > FRAME_N * 0.15) failVideo(); else if (done + failed === FRAME_N) finish(); else worker(); };
    img.src = FRAME_URL(i); };
  const finish = () => { if (framesReady) return; framesReady = true; ring.style.setProperty('--ld', 0); lastFrame = -1; drawFrame(shown * (FRAME_N - 1)); stage.classList.add('video-ready', 'frames'); };
  for (let c = 0; c < CONC; c++) worker();
}
const bands = $$('.band').map(b => ({ el: b, a: +b.dataset.a, b: +b.dataset.b, op: -1, k: -1, ramp: b.dataset.ramp ? +b.dataset.ramp : null }));
function heroProgress() { const range = hero.offsetHeight - stage.offsetHeight; return range > 0 ? clamp(-hero.getBoundingClientRect().top / range, 0, 1) : 0; }
let seekBusy = false, pendingTime = null;
function requestSeek(t) { if (!video.duration) return; if (seekBusy) { pendingTime = t; return; } seekBusy = true; video.currentTime = t; }
video.addEventListener('seeked', () => { seekBusy = false; if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); } });
video.addEventListener('error', () => { seekBusy = false; pendingTime = null; failVideo(); });
let loadK = 0, loadStart = 0;
function updateCaptions(p) {
  for (let i = 0; i < bands.length; i++) {
    const B = bands[i]; const f = Math.min(0.035, (B.b - B.a) / 3);
    let op = smoothstep(p, B.a, B.a + f) * (1 - smoothstep(p, B.b - f, B.b));
    if (i === 0) op = 1 - smoothstep(p, B.b - f, B.b);
    if (i === bands.length - 1) op = smoothstep(p, B.a, B.a + f);
    let k = clamp((p - B.a) / (B.ramp || Math.min(SMALL ? 0.14 : 0.09, (B.b - B.a) * (SMALL ? 0.62 : 0.42))), 0, 1);
    if (i === 0) k = Math.max(k, loadK);
    if (Math.abs(op - B.op) > 0.004 || (op === 0) !== (B.op === 0)) { B.op = op; B.el.style.opacity = op.toFixed(3); }
    if (Math.abs(k - B.k) > 0.008 || (k === 1 && B.k !== 1) || (k === 0 && B.k !== 0)) { B.k = k; B.el.style.setProperty('--k', k.toFixed(3)); }
  }
}
function loadRamp(now) { if (!loadStart) loadStart = now; const t = clamp((now - loadStart - 450) / 2600, 0, 1); loadK = t * t * (3 - 2 * t); updateCaptions(shown); if (t < 1) requestAnimationFrame(loadRamp); }
let target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
function tick(now) {
  const dt = Math.min(100, now - (lastTick || now)); lastTick = now;
  shown += (target - shown) * (1 - Math.pow(1 - (SMALL ? 0.075 : 0.16), dt / 16.667));
  if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; } else rafId = requestAnimationFrame(tick);
  if (FRAMES_MODE) drawFrame(shown * (FRAME_N - 1)); else requestSeek(shown * video.duration);
  updateCaptions(shown);
}
function onScroll() { target = heroProgress(); if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick); }
new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; if (heroOnScreen) onScroll(); }, { threshold: 0 }).observe(hero);
let heroInit = false, started = false, blobUrl = null;
function initHeroOnce() {
  if (heroInit) return; heroInit = true;
  poster.style.backgroundImage = "url('assets/hero-poster.jpg')";
  const img = new Image(); img.onload = startBlobFetch; img.onerror = startBlobFetch; img.src = 'assets/hero-poster.jpg';
  setTimeout(startBlobFetch, 4000); requestAnimationFrame(loadRamp);
}
function startBlobFetch() { if (started) return; started = true; if (FRAMES_MODE) loadFrames(); else loadHeroBlob().catch(failVideo); }
async function loadHeroBlob() {
  const ctrl = new AbortController(); let watchdog = setTimeout(() => ctrl.abort(), 20000);
  const res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
  if (!res.ok || !res.body) throw new Error('video fetch failed');
  const total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
  const reader = res.body.getReader(); const chunks = []; let got = 0, lastRing = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    clearTimeout(watchdog); watchdog = setTimeout(() => ctrl.abort(), 20000);
    chunks.push(value); got += value.length;
    const frac = Math.min(1, got / total), now = performance.now();
    if (now - lastRing > 100 || frac === 1) { lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
  }
  clearTimeout(watchdog); ring.style.setProperty('--ld', 0);
  blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' })); if (mobileMotion) return; video.src = blobUrl; video.load();
  video.addEventListener('canplay', () => { primeVideo(); requestSeek(heroProgress() * video.duration); stage.classList.add('video-ready'); }, { once: true });
}
/* iOS Safari won't decode frames for currentTime seeks until the element has played once; a muted play()+pause() unlocks it */
function primeVideo() { if (mobileMotion) return; const p = video.play(); if (p && p.then) p.then(() => { if (!mobileMotion) video.pause(); }).catch(() => {}); }
function failVideo() {
  if (stage.classList.contains('video-failed')) return;
  const chev = document.createElement('div'); chev.className = 'chev'; chev.setAttribute('aria-hidden', 'true'); chev.textContent = '↓';
  ring.replaceWith(chev); stage.classList.add('video-failed');
  poster.style.backgroundImage = "url('assets/hero-ending.jpg')";
  bands.forEach(B => { B.op = -1; B.k = -1; }); updateCaptions(heroProgress());
}
/* static-hero gates (must match the CSS media query exactly). Phones/tablets in portrait now run the scrub; only short landscape phones and reduced-motion get the static/looping fallback. */
const GATES = ['(orientation: landscape) and (pointer: coarse) and (max-height: 560px)', '(prefers-reduced-motion: reduce)'];
let scrubOn = false;
function enableScrub() { if (scrubOn) return; scrubOn = true; initHeroOnce(); addEventListener('scroll', onScroll, { passive: true }); bands.forEach(B => { B.op = -1; B.k = -1; }); updateCaptions(heroProgress()); onScroll(); }
function disableScrub() { if (!scrubOn) return; scrubOn = false; removeEventListener('scroll', onScroll); if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }
/* mobile / touch: scroll-scrubbing is unreliable on phones, so play the strands video as a muted looping background under the static hero */
let mobileMotion = false;
function enableMobileMotion() {
  if (mobileMotion || RM.matches) return; mobileMotion = true; stage.classList.remove('frames');
  video.pause(); video.removeAttribute('src'); video.load();
  video.muted = true; video.loop = true; video.playsInline = true; video.autoplay = true; video.preload = 'auto';
  video.src = VIDEO_URL;
  const onPlaying = () => { if (mobileMotion) stage.classList.add('mobile-motion'); };
  video.addEventListener('playing', onPlaying, { once: true });
  video.play().catch(() => { /* autoplay blocked or failed: static image stays */ });
}
function disableMobileMotion() {
  if (!mobileMotion) return; mobileMotion = false; if (framesReady) stage.classList.add('frames');
  stage.classList.remove('mobile-motion'); video.pause(); video.loop = false; video.autoplay = false; video.removeAttribute('src'); video.load();
  if (blobUrl) { video.src = blobUrl; video.load(); video.addEventListener('canplay', () => { requestSeek(heroProgress() * video.duration); stage.classList.add('video-ready'); }, { once: true }); }
}
function applyHeroMode() {
  if (GATES.some(q => matchMedia(q).matches)) { disableScrub(); enableMobileMotion(); }
  else { disableMobileMotion(); enableScrub(); }
}
const MQLS = GATES.map(q => matchMedia(q)); MQLS.forEach(m => m.addEventListener('change', applyHeroMode));

/* ---------- reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- testimonial ticker (ported from TestimonialMarquee.tsx) ---------- */
const REVIEWS = {
  en: ['After-hours enquiries stop going cold. | Ops lead, logistics', 'Setup takes about a week. After that, it runs itself. | Founder, B2B supplier', 'Leads get answered in minutes, not the next morning. | Revenue lead, SaaS', 'Manual handoffs between sales and support disappear. | COO, professional services', 'Reconciliation just happens. Nobody has to chase it. | Finance lead, distribution', 'The audit trail is what got compliance to sign off. | Ops manager, freight'],
  de: ['Anfragen nach Feierabend werden nicht mehr kalt. | Ops-Lead, Logistik', 'Die Einrichtung dauert etwa eine Woche. Danach läuft es von selbst. | Gründer, B2B-Lieferant', 'Leads werden in Minuten beantwortet, nicht am nächsten Morgen. | Revenue-Lead, SaaS', 'Manuelle Übergaben zwischen Vertrieb und Support verschwinden. | COO, Dienstleistungen', 'Der Abgleich passiert einfach. Niemand muss hinterher. | Finanzleitung, Distribution', 'Der Audit-Trail hat Compliance überzeugt. | Ops-Manager, Spedition']
};
function buildTicker() {
  const tr = $('#tmtrack'); if (!tr) return; const l = html.getAttribute('data-lang') || 'en';
  const items = REVIEWS[l] || REVIEWS.en; const frag = document.createDocumentFragment();
  [...items, ...items].forEach((line, i) => { const [q, role] = line.split('|').map(s => s.trim()); const s = document.createElement('span'); s.className = 'tm-item'; if (i >= items.length) s.setAttribute('aria-hidden', 'true'); s.innerHTML = `<b></b><i aria-hidden="true"></i><small></small>`; s.querySelector('b').textContent = q; s.querySelector('small').textContent = role; frag.appendChild(s); });
  tr.textContent = ''; tr.appendChild(frag);
}
setLang(lang);

/* ---------- savings calculator (ported from SavingsCalculator.tsx) ---------- */
(() => {
  const track = $('#calc-track'); if (!track) return;
  const MIN = 1, MAX = 150, HOURS = 1600, SHARE = 20, COST = 37.5, CUR = '€';
  const span = MAX - MIN; let team = 20, dragging = false;
  const fill = $('#calc-fill'), knob = $('#calc-knob'), nEl = $('#calc-n'), sEl = $('#calc-save'), hEl = $('#calc-hours');
  const fmt = n => n.toLocaleString('en-US');
  function render() {
    const v = clamp(team, MIN, MAX), pct = ((v - MIN) / span) * 100;
    const hours = Math.round(v * HOURS * (SHARE / 100)), sav = Math.round(hours * COST);
    fill.style.width = pct + '%'; knob.style.left = pct + '%';
    nEl.textContent = fmt(v); sEl.textContent = CUR + fmt(sav); hEl.textContent = fmt(hours) + ' h';
    track.setAttribute('aria-valuenow', v);
  }
  function fromX(x) { const r = track.getBoundingClientRect(); if (!r.width) return; team = Math.round(MIN + clamp((x - r.left) / r.width, 0, 1) * span); render(); }
  track.addEventListener('pointerdown', e => { e.preventDefault(); dragging = true; track.classList.add('drag'); track.setPointerCapture(e.pointerId); fromX(e.clientX); });
  track.addEventListener('pointermove', e => { if (dragging) fromX(e.clientX); });
  const up = () => { dragging = false; track.classList.remove('drag'); };
  track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
  track.addEventListener('keydown', e => { const step = Math.max(1, Math.round(span / 40)); let n = null; if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = team + step; if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = team - step; if (e.key === 'Home') n = MIN; if (e.key === 'End') n = MAX; if (n === null) return; e.preventDefault(); team = clamp(n, MIN, MAX); render(); });
  render();
})();

/* ---------- live automation demo (ported from LiveAutomationDemo.tsx) ---------- */
(() => {
  const root = $('#lad'); if (!root) return;
  const TIMELINE = [{ at: 0, clock: 0 }, { at: 3, clock: 72 }, { at: 9.5, clock: 260 }, { at: 15, clock: 514 }];
  const CHAT_AT = [4, 5.6, 7, 10.5, 12.2];
  const RUNTIME = 18.5, STORY_TOTAL = 514, LAST = TIMELINE.length - 1;
  const lis = $$('#lad-tl > li'), segs = lis.map(li => li.querySelector('.segfill')).filter(Boolean), msgs = $$('#lad-chat .msg'), chat = $('#lad-chat'), clockEl = $('#lad-clock'), toggle = $('#lad-toggle');
  const mmss = t => { const s = Math.max(0, Math.round(t)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const storyClock = e => { if (e <= 0) return 0; for (let i = 0; i < LAST; i++) { const a = TIMELINE[i], b = TIMELINE[i + 1]; if (e < b.at) return a.clock + ((e - a.at) / (b.at - a.at)) * (b.clock - a.clock); } return STORY_TOTAL; };
  const segP = (e, i) => clamp((e - TIMELINE[i].at) / (TIMELINE[i + 1].at - TIMELINE[i].at), 0, 1);
  let elapsed = 0, last = 0, raf = null, playing = false, done = false, started = false, lastIdx = -2, lastCount = -1, lastClock = '';
  function applyFrame(e) {
    for (let i = 0; i < LAST; i++) segs[i].style.transform = `scaleY(${segP(e, i)})`;
    const c = mmss(storyClock(e)); if (c !== lastClock) { lastClock = c; clockEl.textContent = c; }
    let idx = -1; for (let i = 0; i < TIMELINE.length; i++) if (e >= TIMELINE[i].at) idx = i;
    if (idx !== lastIdx) { lastIdx = idx; lis.forEach((li, i) => { li.classList.toggle('lit', i <= idx); li.classList.toggle('active', i === idx); }); }
    let count = 0; for (const a of CHAT_AT) if (e >= a) count++;
    if (count !== lastCount) { lastCount = count; msgs.forEach((m, i) => m.classList.toggle('show', i < count)); chat.scrollTo({ top: chat.scrollHeight, behavior: RM.matches ? 'auto' : 'smooth' }); }
  }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }
  function frame(now) {
    const dt = (now - last) / 1000; last = now; elapsed = Math.min(RUNTIME, elapsed + dt); applyFrame(elapsed);
    if (elapsed >= RUNTIME) { stop(); playing = false; done = true; root.classList.remove('playing'); root.classList.add('done'); toggle.setAttribute('aria-label', 'Replay automation demo'); return; }
    raf = requestAnimationFrame(frame);
  }
  function play() { stop(); last = performance.now(); raf = requestAnimationFrame(frame); playing = true; root.classList.add('playing'); root.classList.remove('done'); toggle.setAttribute('aria-label', 'Pause automation demo'); }
  function pause() { stop(); playing = false; root.classList.remove('playing'); toggle.setAttribute('aria-label', 'Play automation demo'); }
  toggle.addEventListener('click', () => { if (RM.matches) return; if (done) { elapsed = 0; done = false; applyFrame(0); play(); return; } playing ? pause() : play(); });
  if (RM.matches) { applyFrame(RUNTIME); root.classList.add('done'); return; }
  applyFrame(0);
  new IntersectionObserver(([en]) => { if (en.isIntersecting) { if (!started) { started = true; play(); } else if (playing && elapsed < RUNTIME) play(); } else if (playing) { stop(); } }, { threshold: 0.5 }).observe(root);
})();


/* ---------- stack ticker: flows, and the chip nearest the center lights up ---------- */
(() => {
  const list = $('#stacklist'), vp = $('#stackvp'); if (!list || !vp) return;
  const TOOLS = [['Slack','#4A154B','S'],['HubSpot','#FF7A59','H'],['Microsoft 365','#D83B01','M'],['Supabase','#3ECF8E','S'],['n8n','#EA4B71','n'],['Salesforce','#00A1E0','S'],['Notion','#111111','N'],['Google Workspace','#4285F4','G'],['Zapier','#FF4F00','Z'],['Stripe','#635BFF','S'],['WhatsApp','#25D366','W'],['Gmail','#EA4335','G'],['Shopify','#96BF48','S'],['Pipedrive','#1A1A1A','P']];
  const frag = document.createDocumentFragment();
  const mk = (t, clone) => { const li = document.createElement('li'); li.style.setProperty('--c', t[1]); li.innerHTML = `<span class="mk" aria-hidden="true"></span><span class="nm"></span>`; li.querySelector('.mk').textContent = t[2]; li.querySelector('.nm').textContent = t[0]; if (clone) li.setAttribute('aria-hidden', 'true'); return li; };
  const plus = clone => { const li = document.createElement('li'); li.className = 'plus'; li.innerHTML = `<span class="mk" aria-hidden="true">+</span><span class="nm"><span class="en">your stack</span><span class="de">Ihr Stack</span></span>`; if (clone) li.setAttribute('aria-hidden', 'true'); return li; };
  [false, true].forEach(clone => { TOOLS.forEach(t => frag.appendChild(mk(t, clone))); frag.appendChild(plus(clone)); });
  list.appendChild(frag);
  const items = $$('li', list); let on = false, raf = null, hot = null;
  function loop() {
    if (!on) { raf = null; return; }
    const r = vp.getBoundingClientRect(); const cx = r.left + r.width / 2; let best = null, bd = 1e9;
    for (const li of items) {
      const b = li.getBoundingClientRect(); if (b.right < r.left - 50 || b.left > r.right + 50) continue;
      const d = Math.abs(b.left + b.width / 2 - cx); const t = clamp(1 - d / (r.width * 0.36), 0, 1);
      const s = (1 + t * t * 0.22).toFixed(3), o = (0.62 + t * 0.38).toFixed(3);
      if (li._s !== s) { li._s = s; li.style.setProperty('--s', s); }
      if (li._o !== o) { li._o = o; li.style.setProperty('--o', o); }
      if (d < bd) { bd = d; best = li; }
    }
    if (best !== hot) { if (hot) hot.classList.remove('hot'); hot = best; if (hot) hot.classList.add('hot'); }
    raf = requestAnimationFrame(loop);
  }
  new IntersectionObserver(([e]) => { on = e.isIntersecting && !RM.matches; if (on && raf === null) raf = requestAnimationFrame(loop); }, { threshold: 0 }).observe(vp);
})();

/* ---------- CTA band: reveal on first entry; hidden state is JS-applied so no-JS stays visible ---------- */
(function () {
  const band = document.querySelector('.cta-band');
  if (!band) return;
  if (RM.matches) return;                       // reduced motion: never hide, never animate
  band.classList.add('reveal-ready');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { band.classList.add('is-visible'); io.disconnect(); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
  io.observe(band);
})();
/* ---------- form: mailto ---------- */
const form = $('#form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = (fd.get('name') || '').toString().trim(), email = (fd.get('email') || '').toString().trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { (name ? form.email : form.name).focus(); return; }
  const en = html.getAttribute('data-lang') === 'en';
  const subject = (en ? 'Workflow enquiry from ' : 'Workflow-Anfrage von ') + name;
  const body = ['Name: ' + name, (en ? 'Company: ' : 'Firma: ') + (fd.get('company') || ''), 'Email: ' + email, '', (en ? 'What should run itself?' : 'Was soll von selbst laufen?'), (fd.get('msg') || '').toString()].join('\n');
  location.href = 'mailto:hello@genworq.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  $('.success', form).hidden = false;
});

/* ---------- reduced motion, both directions ---------- */
function pinToFinalStates() { disableScrub(); $$('.reveal').forEach(el => el.classList.add('in')); }
RM.addEventListener('change', e => { if (e.matches) pinToFinalStates(); else applyHeroMode(); });
applyHeroMode();
if (RM.matches) pinToFinalStates();
})();
