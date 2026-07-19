/* matsunori — "the seam and the seal" cursor.
   The pointer is the site's uni status dot; movement scores a fading 1px
   gold seam in its wake (the draw-in primitive, made interactive); clicks
   press a small akami hanko ring. Pointer-fine devices only; reduced
   motion and touch keep the native cursor. */

(function () {
  'use strict';
  if (!window.matchMedia) return;
  if (!matchMedia('(pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('mtn-cursor');

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.style.opacity = '0';
  document.body.appendChild(dot);

  var cv = document.createElement('canvas');
  cv.id = 'cursor-seam';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  function size() {
    cv.width = Math.max(1, innerWidth * dpr);
    cv.height = Math.max(1, innerHeight * dpr);
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
  }
  size();
  addEventListener('resize', size, { passive: true });

  var LIFE = 420; // ms a seam segment lives
  var pts = [], raf = null;
  function loop() {
    raf = null;
    var now = performance.now();
    ctx.clearRect(0, 0, cv.width, cv.height);
    while (pts.length && now - pts[0].t > LIFE) pts.shift();
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var age = (now - b.t) / LIFE;
      ctx.strokeStyle = 'rgba(217,164,65,' + (0.4 * (1 - age)).toFixed(3) + ')';
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.moveTo(a.x * dpr, a.y * dpr);
      ctx.lineTo(b.x * dpr, b.y * dpr);
      ctx.stroke();
    }
    if (pts.length > 1) raf = requestAnimationFrame(loop);
  }

  var INTERACTIVE = 'a, button, summary, [role="button"], .loc-card, .g-item, .news-row, .news-hl, .menu-sheet, .pill';

  addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    dot.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    var overField = e.target && e.target.closest && e.target.closest('input, textarea, select');
    dot.style.opacity = overField ? '0' : '1';
    dot.classList.toggle('hover', !overField && !!(e.target && e.target.closest && e.target.closest(INTERACTIVE)));
    pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });

  addEventListener('pointerdown', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    dot.classList.add('down');
    var s = document.createElement('div');
    s.className = 'cursor-stamp';
    s.style.left = e.clientX + 'px';
    s.style.top = e.clientY + 'px';
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 620);
  }, { passive: true });

  addEventListener('pointerup', function () { dot.classList.remove('down'); }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { dot.style.opacity = '0'; });
})();
