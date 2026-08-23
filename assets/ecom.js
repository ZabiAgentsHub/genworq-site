/* E-commerce page: attach the CTA band photograph only when the band approaches the
   viewport, so it never competes with first paint. */
(() => {
'use strict';
const band = document.getElementById('cta'); if (!band) return;
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { band.classList.add('img-ready'); io.disconnect(); } }), { rootMargin: '600px 0px' });
io.observe(band);
})();
