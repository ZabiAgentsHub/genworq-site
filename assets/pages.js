/* Genworq subpages: language, nav, reveals, FAQ, form, toolkit ticker. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const html = document.documentElement;

function setLang(l) {
  html.setAttribute('data-lang', l); html.setAttribute('lang', l);
  try { localStorage.setItem('gw-lang', l); } catch (e) {}
  $$('[data-ph-en]').forEach(el => el.placeholder = el.getAttribute('data-ph-' + l));
}
let lang = 'en'; try { lang = localStorage.getItem('gw-lang') || 'en'; } catch (e) {}
setLang(lang);
$('#langbtn').addEventListener('click', () => setLang(html.getAttribute('data-lang') === 'en' ? 'de' : 'en'));

const links = $('#navlinks'), burger = $('#burger');
burger.addEventListener('click', () => { const o = links.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
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

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
$$('.reveal').forEach(el => io.observe(el));
if (RM.matches) $$('.reveal').forEach(el => el.classList.add('in'));

/* toolkit ticker (same engine as the home strip) */
(() => {
  const list = $('#stacklist'), vp = $('#stackvp'); if (!list || !vp) return;
  /* NB: --logo is consumed by a mask rule inside assets/style.css, so the relative URL
     resolves against that stylesheet's folder (assets/), not against the page. */
  const TOOLS = [['n8n', '#EA4B71', 'n8n'], ['Python', '#3776AB', 'python'], ['OpenAI', '#10A37F', 'openai'], ['Docker', '#2496ED', 'docker'], ['AWS', '#FF9900', 'aws'], ['Supabase', '#3ECF8E', 'supabase'], ['Microsoft 365', '#D83B01', 'microsoft365'], ['Slack', '#4A154B', 'slack'], ['HubSpot', '#FF7A59', 'hubspot'], ['Google Sheets', '#0F9D58', 'googlesheets']];
  const frag = document.createDocumentFragment();
  [false, true].forEach(clone => TOOLS.forEach(t => { const li = document.createElement('li'); li.style.setProperty('--c', t[1]); li.innerHTML = '<span class="mk" aria-hidden="true"></span><span class="nm"></span>'; li.style.setProperty('--logo', `url(logos/${t[2]}.svg)`); li.querySelector('.nm').textContent = t[0]; if (clone) li.setAttribute('aria-hidden', 'true'); frag.appendChild(li); }));
  list.appendChild(frag);
  const items = $$('li', list); let on = false, raf = null, hot = null;
  function loop() {
    if (!on) { raf = null; return; }
    const r = vp.getBoundingClientRect(); const cx = r.left + r.width / 2; let best = null, bd = 1e9;
    for (const li of items) {
      const b = li.getBoundingClientRect(); if (b.right < r.left - 50 || b.left > r.right + 50) continue;
      const d = Math.abs(b.left + b.width / 2 - cx); const t = clamp(1 - d / (r.width * 0.36), 0, 1);
      const s = (1 + t * t * 0.3).toFixed(3), o = (0.58 + t * 0.42).toFixed(3);
      if (li._s !== s) { li._s = s; li.style.setProperty('--s', s); }
      if (li._o !== o) { li._o = o; li.style.setProperty('--o', o); }
      if (d < bd) { bd = d; best = li; }
    }
    if (best !== hot) { if (hot) hot.classList.remove('hot'); hot = best; if (hot) hot.classList.add('hot'); }
    raf = requestAnimationFrame(loop);
  }
  new IntersectionObserver(([e]) => { on = e.isIntersecting && !RM.matches; if (on && raf === null) raf = requestAnimationFrame(loop); }, { threshold: 0 }).observe(vp);
})();

const form = $('#form');
if (form) form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const name = (fd.get('name') || '').toString().trim(), email = (fd.get('email') || '').toString().trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { (name ? form.email : form.name).focus(); return; }
  const en = html.getAttribute('data-lang') === 'en';
  const subject = (en ? 'Workflow enquiry from ' : 'Workflow-Anfrage von ') + name + ' (' + document.title + ')';
  const body = ['Name: ' + name, (en ? 'Company: ' : 'Firma: ') + (fd.get('company') || ''), 'Email: ' + email, '', (en ? 'What should run itself?' : 'Was soll von selbst laufen?'), (fd.get('msg') || '').toString()].join('\n');
  location.href = 'mailto:hello@genworq.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  $('.success', form).hidden = false;
});
})();
