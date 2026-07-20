/* matsunori — "one roll at a time"
   Animation + state engine, ported 1:1 from the design prototype (Matsunori Site.dc.html).
   Everything runs on rAF + IntersectionObserver + CSS transitions — no dependencies. */

(function () {
  'use strict';

  var EASE = 'cubic-bezier(.16,1,.3,1)';
  var UNI = '#D9A441', STEAM = '#8A8578';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ============ live hours (America/New_York) ============ */

  function nycNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); }
  function fmtMin(min) {
    var h = Math.floor(min / 60), mm = min % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap;
  }
  // minutes-from-midnight spans per weekday (0 = Sunday), per matsunori.com
  function fenwaySched(day) {
    return day === 0 ? [[690, 840], [960, 1320]]   // Sun 11:30–14:00, 16:00–22:00
      : day === 6 ? [[690, 840], [960, 1350]]      // Sat 11:30–14:00, 16:00–22:30
      : day === 5 ? [[1020, 1350]]                 // Fri 17:00–22:30
      : [[1020, 1320]];                            // Mon–Thu 17:00–22:00
  }
  function licSched(day) {                          // daily 17:00–22:30; Sat/Sun lunch 11:30–15:00
    return (day === 0 || day === 6) ? [[690, 900], [1020, 1350]] : [[1020, 1350]];
  }
  function getStatus(sched) {
    var d = nycNow(), day = d.getDay(), m = d.getHours() * 60 + d.getMinutes();
    var spans = sched(day), i;
    for (i = 0; i < spans.length; i++) if (m >= spans[i][0] && m < spans[i][1]) return { open: true, label: 'OPEN — CLOSES ' + fmtMin(spans[i][1]) };
    for (i = 0; i < spans.length; i++) if (m < spans[i][0]) return { open: false, label: 'CLOSED — OPENS ' + fmtMin(spans[i][0]) };
    var next = sched((day + 1) % 7);
    return { open: false, label: 'CLOSED — OPENS ' + fmtMin(next[0][0]) + ' TOMORROW' };
  }

  var pill = $('#pill'), pillLabel = $('#pill-label');
  function renderStatus() {
    var f = getStatus(fenwaySched), l = getStatus(licSched);
    var anyOpen = f.open || l.open;
    if (pill) {
      pill.classList.toggle('is-open', anyOpen);
      pillLabel.textContent = anyOpen ? 'OPEN NOW' : 'CLOSED NOW';
    }
    var fd = $('#fenway-dot'), fl = $('#fenway-label'), ld = $('#lic-dot'), ll = $('#lic-label');
    if (fd) { fd.style.background = f.open ? UNI : STEAM; fl.style.color = f.open ? UNI : STEAM; fl.textContent = f.label; }
    if (ld) { ld.style.background = l.open ? UNI : STEAM; ll.style.color = l.open ? UNI : STEAM; ll.textContent = l.label; }
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ============ nav open-now panel ============ */

  if (pill) {
    var navT = null;
    var setShow = function (on) { pill.classList.toggle('show', on); pill.setAttribute('aria-expanded', on ? 'true' : 'false'); };
    pill.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(navT); setShow(true);
    });
    pill.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(navT); navT = setTimeout(function () { setShow(false); }, 320);
    });
    pill.addEventListener('click', function (e) {
      if (e.target.closest('.pill-panel')) return;
      setShow(!pill.classList.contains('show'));
    });
    pill.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShow(!pill.classList.contains('show')); }
      if (e.key === 'Escape') setShow(false);
    });
  }

  /* ============ location card hover ============ */

  var locGrid = $('.loc-grid');
  $$('.loc-card').forEach(function (card) {
    card.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      locGrid.classList.add('has-hover'); card.classList.add('hovered');
    });
    card.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      locGrid.classList.remove('has-hover'); card.classList.remove('hovered');
    });
  });

  /* ============ intro loader (once per session) ============ */

  var loader = $('#loader');
  var seen = false;
  try { seen = !!sessionStorage.getItem('mtn-intro'); } catch (err) {}
  if (reduced || seen) {
    loader.classList.add('done');
    heroIntro(150);
  } else {
    try { sessionStorage.setItem('mtn-intro', '1'); } catch (err) {}
    setTimeout(function () { loader.classList.add('seam'); }, 80);
    setTimeout(function () { loader.classList.remove('seam'); loader.classList.add('open'); }, 700);
    setTimeout(function () { loader.classList.add('done'); heroIntro(0); }, 1420);
  }

  /* ============ hero intro ============ */

  function heroIntro(delayBase) {
    var letters = $$('[data-lt] > span'), subs = $$('.hero-sub'), k = $('[data-kanji]');
    letters.forEach(function (s, i) {
      if (reduced) { s.style.transform = 'none'; return; }
      s.style.transition = 'transform .65s ' + EASE + ' ' + (delayBase + i * 55) + 'ms';
    });
    subs.forEach(function (s, i) {
      if (reduced) s.style.transition = 'none';
      else {
        var d = i === 0 ? '.7s' : '.85s';
        s.style.transition = 'opacity .7s ' + EASE + ' ' + d + ', transform .7s ' + EASE + ' ' + d;
      }
    });
    if (k && reduced) k.style.transition = 'none';
    // flush the transition styles, then flip to final state on a fresh task
    // (setTimeout instead of rAF so a backgrounded/occluded tab still reveals)
    void document.body.offsetWidth;
    setTimeout(function () {
      if (!reduced) letters.forEach(function (s) { s.style.transform = 'translateY(0)'; });
      subs.forEach(function (s) { s.style.opacity = '1'; s.style.transform = 'none'; });
      if (k) k.style.maxHeight = '340px';
    }, 20);
  }

  var heroMedia = $('[data-hero]');
  if (heroMedia && heroMedia.tagName === 'VIDEO') {
    heroMedia.muted = true;
    var p = heroMedia.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* ============ reveal system ============ */

  var pending = null, io = null;
  function prepAnim(el) {
      var kind = el.getAttribute('data-anim');
      if (kind === 'fade' || kind === 'row') {
        el.style.opacity = '0';
        el.style.transform = kind === 'row' ? 'translateX(-18px)' : 'translateY(14px)';
        el.style.transition = 'opacity .6s ' + EASE + ', transform .6s ' + EASE;
      } else if (kind === 'wipe') {
        var dir = el.getAttribute('data-dir') || 'right';
        el.style.clipPath = dir === 'right' ? 'inset(0 100% 0 0)' : dir === 'left' ? 'inset(0 0 0 100%)' : 'inset(100% 0 0 0)';
        el.style.transition = 'clip-path .8s ' + EASE;
      } else if (kind === 'draw-x') {
        el.style.transform = 'scaleX(0)'; el.style.transformOrigin = 'center';
        el.style.transition = 'transform .6s ' + EASE;
      } else if (kind === 'stamp') {
        el.style.opacity = '0'; el.style.transform = 'scale(1.18) rotate(4deg)';
        el.style.transition = 'opacity .28s ease-out, transform .3s cubic-bezier(.3,1.1,.4,1)';
      } else if (kind === 'tracking') {
        el.style.opacity = '0'; el.style.letterSpacing = '.1em';
        el.style.transition = 'opacity .7s ' + EASE + ', letter-spacing .9s ' + EASE;
      } else if (kind === 'mask-rise') {
        var inner = document.createElement('div');
        while (el.firstChild) inner.appendChild(el.firstChild);
        el.appendChild(inner);
        el.style.overflow = 'hidden';
        inner.style.transform = 'translateY(105%)';
        inner.style.transition = 'transform .85s ' + EASE;
        el._inner = inner;
      } else if (kind === 'words') {
        // split into masked words; words inside a <mark class="hl"> keep a
        // .hlw tag so the highlight can sweep them after the rise
        var wordList = [];
        Array.prototype.forEach.call(el.childNodes, function (node) {
          var hl = node.nodeType === 1 && node.classList && node.classList.contains('hl');
          (node.textContent || '').split(/\s+/).filter(Boolean).forEach(function (w) {
            wordList.push({ w: w, hl: hl });
          });
        });
        el.textContent = '';
        wordList.forEach(function (item, i) {
          var mask = document.createElement('span');
          mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:.1em;margin-bottom:-.1em';
          var inner = document.createElement('span');
          inner.style.cssText = 'display:inline-block;transform:translateY(110%);transition:transform .6s ' + EASE + ' ' + (i * 60) + 'ms';
          if (item.hl) { inner.classList.add('hlw'); inner.classList.add('on'); } // statically highlighted
          inner.textContent = item.w;
          mask.appendChild(inner);
          el.appendChild(mask);
          el.appendChild(document.createTextNode(' '));
        });
      }
  }
  function setupAnims() {
    var els = $$('[data-anim]');
    if (reduced) return;
    els.forEach(prepAnim);
    pending = new Set(els);
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) reveal(e.target); });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }
  // register an element injected after initial setup (e.g. live news rows)
  function watchAnim(el) {
    if (reduced || !io) return;
    prepAnim(el);
    pending.add(el);
    io.observe(el);
  }

  function reveal(el) {
    if (!pending || !pending.has(el)) return;
    pending.delete(el);
    if (io) io.unobserve(el);
    var kind = el.getAttribute('data-anim');
    var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
    setTimeout(function () {
      if (kind === 'fade' || kind === 'row') { el.style.opacity = '1'; el.style.transform = 'none'; }
      else if (kind === 'wipe') { el.style.clipPath = 'inset(0 0 0 0)'; }
      else if (kind === 'draw-x') { el.style.transform = 'scaleX(1)'; }
      else if (kind === 'stamp') { el.style.opacity = '1'; el.style.transform = 'none'; }
      else if (kind === 'tracking') { el.style.opacity = '1'; el.style.letterSpacing = '.36em'; }
      else if (kind === 'mask-rise' && el._inner) { el._inner.style.transform = 'translateY(0)'; }
      else if (kind === 'words') { $$('span > span', el).forEach(function (s) { s.style.transform = 'translateY(0)'; }); }
    }, delay);
  }

  setupAnims();

  /* ============ anatomy (scroll-pinned) ============ */

  var anatomyWrap = $('#anatomy-wrap');
  var folds = [$('#fold1'), $('#fold2'), $('#fold3')];
  var caps = $$('.anat-cap');
  var steps = $$('.anatomy-steps .anat-step');
  var stepsM = $$('.anatomy-steps-m .anat-step-label');
  var anatNum = $('#anat-num'), anatProg = $('#anat-prog'), sweep = $('#anatomy-sweep');
  var curFrame = -1;

  // the fold illustrations are looping videos (posters carry the static art)
  function kickFolds() {
    folds.forEach(function (v) {
      if (!v || v.tagName !== 'VIDEO' || !v.paused) return;
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }
  if (reduced) {
    folds.forEach(function (v) {
      if (v && v.tagName === 'VIDEO') { v.removeAttribute('autoplay'); v.pause(); }
    });
  } else {
    kickFolds();
    // hidden documents suspend playback; resume when the tab returns
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) kickFolds();
    });
  }

  function clipFor(frame, i) {
    return frame === i ? 'inset(0 0 0 0)' : frame > i ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
  }
  function runSweep() {
    if (reduced || !sweep) return;
    sweep.style.animation = 'none';
    void sweep.offsetWidth;
    sweep.style.animation = 'mtnSweep .55s cubic-bezier(.7,0,.3,1)';
  }
  function updateAnatomy(frame, progVal) {
    if (frame !== curFrame) {
      if (curFrame !== -1) runSweep();
      curFrame = frame;
      folds.forEach(function (img, i) {
        img.style.clipPath = clipFor(frame, i);
        img.style.opacity = frame === i ? '1' : '0';
        img.style.animation = (frame === i && !reduced) ? 'mtnDrift 5s ease-in-out infinite alternate' : 'none';
      });
      caps.forEach(function (c, i) { c.classList.toggle('active', frame === i); });
      steps.forEach(function (s, i) { s.classList.toggle('active', frame === i); });
      stepsM.forEach(function (s, i) { s.classList.toggle('active', frame === i); });
      anatNum.textContent = '0' + (frame + 1);
    }
    anatProg.style.width = (progVal * 100).toFixed(1) + '%';
  }

  /* ============ mobile gallery deck ============ */

  var GAL = ['2', '6', '5', '7', '1', '3'].map(function (n) { return 'assets/gallery/' + n + '.webp'; });
  var GAL_CAPTIONS = ['The counter', 'Toasted to order', 'House soy', 'Hokkaido uni', 'The first roll', 'Crisp nori'];
  var galWrap = $('#gal-wrap');
  var galCard = $('#gal-card'), galImg = $('#gal-img'), galUnder = $('#gal-under');
  var galFly = $('#gal-fly'), galFlyImg = $('#gal-fly-img');
  var galCaption = $('#gal-caption'), galNum = $('#gal-num');
  var galSegs = $$('#gal-segs span');
  var galHeart = $('#gal-heart'), galHint = $('#gal-hint'), galOishii = $('#gal-oishii');
  var galIdx = 0, galInit = false, galFlyT = null;
  var heartT = null, heartOn = false;
  var gDrag = false, gMode = null, gx = 0, gy = 0, gdx = 0;

  function applyGal() {
    galImg.src = GAL[galIdx];
    galUnder.src = GAL[(galIdx + 1) % GAL.length];
    galCaption.textContent = GAL_CAPTIONS[galIdx];
    galNum.textContent = '0' + (galIdx + 1);
    galSegs.forEach(function (s, i) { s.classList.toggle('seen', galIdx >= i); });
  }
  if (galCard) applyGal();
  function setGalIdx(idx) {
    if (idx === galIdx) return;
    galIdx = idx;
    applyGal();
  }
  function updateHint() {
    galHint.classList.toggle('hide', gdx > 20 || heartOn);
  }
  function flyGo(i) {
    clearTimeout(galFlyT);
    galFlyImg.src = GAL[i];
    heartOn = true; updateHint();
    galHeart.classList.remove('on');
    void galHeart.offsetWidth;
    galHeart.classList.add('on');
    clearTimeout(heartT);
    heartT = setTimeout(function () { heartOn = false; galHeart.classList.remove('on'); updateHint(); }, 1000);
    if (!reduced) {
      galFly.style.transition = 'none';
      galFly.style.transform = 'translate(0,0) rotate(0deg)';
      void galFly.offsetWidth;
      galFly.style.transition = 'transform .55s cubic-bezier(.7,0,.3,1)';
      galFly.style.transform = 'translate(120vw,40px) rotate(9deg)';
    }
  }
  // scrubbing back: the returning card flies in from the right and lands on
  // the stack (the real card beneath already shows the same image)
  function flyBack(i) {
    if (reduced) return;
    clearTimeout(galFlyT);
    galFlyImg.src = GAL[i];
    galFly.style.transition = 'none';
    galFly.style.transform = 'translate(120vw,40px) rotate(9deg)';
    void galFly.offsetWidth;
    galFly.style.transition = 'transform .5s ' + EASE;
    galFly.style.transform = 'translate(0,0) rotate(0deg)';
    galFlyT = setTimeout(function () {
      galFly.style.transition = 'none';
      galFly.style.transform = 'translateX(120vw)';
    }, 520);
  }
  // scrubbed exactly like the anatomy pin: the card index maps directly to
  // pinned progress, reversible in both directions, no scroll manipulation
  function deckPass(vh) {
    if (!galWrap || window.innerWidth >= 780) return;
    var r = galWrap.getBoundingClientRect();
    var total = r.height - vh;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    var stage = Math.min(GAL.length - 1, Math.floor(p * GAL.length));
    if (!galInit) {
      // first pass (including reload mid-deck via scroll restoration)
      galInit = true;
      galIdx = stage;
      applyGal();
      return;
    }
    if (stage === galIdx) return;
    var prev = galIdx;
    setGalIdx(stage);
    if (stage > prev) flyGo(prev); // forward: the old card swipes out (+ heart)
    else flyBack(stage);           // backward: the card returns
  }

  if (galCard) {
    galCard.addEventListener('pointerdown', function (e) {
      gDrag = true; gMode = null; gx = e.clientX; gy = e.clientY; gdx = 0;
      try { galCard.setPointerCapture(e.pointerId); } catch (err) {}
      galCard.style.transition = 'none';
    });
    galCard.addEventListener('pointermove', function (e) {
      if (!gDrag) return;
      var dx = e.clientX - gx, dy = e.clientY - gy;
      if (!gMode) {
        if (Math.hypot(dx, dy) < 8) return;
        gMode = Math.abs(dx) > Math.abs(dy) ? 'x' : 'scroll';
      }
      if (gMode !== 'x') return;
      gdx = dx < 0 ? dx * 0.22 : dx;
      galCard.style.transform = 'translateX(' + gdx + 'px) rotate(' + (gdx * 0.05).toFixed(2) + 'deg)';
      galOishii.style.opacity = Math.min(1, Math.max(0, (gdx - 30) / 70));
      updateHint();
    });
    var galEnd = function () {
      if (!gDrag) return;
      gDrag = false;
      var ok = gMode === 'x' && gdx > 80;
      galCard.style.transition = 'transform .45s ' + EASE;
      galCard.style.transform = 'translateX(0) rotate(0deg)';
      galOishii.style.opacity = 0;
      gdx = 0; updateHint();
      // smooth-scroll one stage step: scroll stays the driver, the stage
      // crossing plays the fly-out exactly as a scrolled advance would
      if (ok) window.scrollBy(0, (galWrap.offsetHeight - window.innerHeight) / GAL.length + 2);
      gMode = null;
    };
    galCard.addEventListener('pointerup', galEnd);
    galCard.addEventListener('pointercancel', galEnd);
  }

  /* ============ news (live press mentions via /api/news) ============ */

  var newsSection = $('#news'), newsList = $('#news-list'), newsAllBtn = $('#news-all'), newsNote = $('#news-note');
  var newsModal = $('#news-modal'), newsBody = $('#news-modal-body');
  var newsItems = [], newsNodes = [], newsCursor = 0;
  var NEWS_HOME = 5, NEWS_CHUNK = 14;
  var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  var MONTHS_S = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function first15(s) {
    if (!s) return null;
    var w = s.trim().split(/\s+/);
    return w.length <= 15 ? s.trim() : w.slice(0, 15).join(' ') + '…';
  }
  function fmtItemDate(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return '';
    return MONTHS_S[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function fmtMonth(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return null;
    return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function newsRow(item) {
    var a = document.createElement('a');
    a.className = 'news-row';
    a.href = item.url; a.target = '_blank'; a.rel = 'noopener';
    var thumb = item.image
      ? '<span class="news-thumb' + (item.imageType === 'favicon' ? ' fav' : '') + '"><img src="' + escHtml(item.image) + '" alt="" loading="lazy"></span>'
      : '<span class="news-thumb ph"><span>松</span></span>';
    var src = (item.source || '').toUpperCase();
    var date = fmtItemDate(item.date);
    var snip = first15(item.snippet);
    a.innerHTML = thumb +
      '<span class="news-meta">' +
        '<span class="news-src">' + escHtml(src + (src && date ? ' — ' : '') + date) + '</span>' +
        '<span class="news-title">' + escHtml(item.title) + '</span>' +
        (snip ? '<span class="news-snip">' + escHtml(snip) + '</span>' : '') +
      '</span>' +
      '<span class="news-arrow">↗</span>';
    var img = a.querySelector('.news-thumb img');
    if (img) img.addEventListener('error', function () {
      var t = img.parentElement;
      t.className = 'news-thumb ph';
      t.innerHTML = '<span>松</span>';
    });
    return a;
  }

  function buildModalNodes() {
    var lastMonth = null;
    newsNodes = [];
    newsItems.forEach(function (it) {
      var m = fmtMonth(it.date);
      if (m && m !== lastMonth) {
        lastMonth = m;
        var h = document.createElement('div');
        h.className = 'news-month';
        h.textContent = m;
        newsNodes.push(h);
      }
      newsNodes.push(newsRow(it));
    });
  }

  function renderNewsChunk() {
    var end = Math.min(newsNodes.length, newsCursor + NEWS_CHUNK);
    for (; newsCursor < end; newsCursor++) newsBody.appendChild(newsNodes[newsCursor]);
  }

  function newsUnavailable() {
    newsSection.hidden = false;
    newsAllBtn.hidden = true;
    newsNote.hidden = false;
  }

  function loadNews() {
    if (!newsSection || !window.fetch) return;
    fetch('/api/news').then(function (r) { return r.json(); }).then(function (data) {
      newsItems = (data.items || []).filter(function (it) { return it && it.title && it.url; });
      if (!newsItems.length) {
        if (data.error) newsUnavailable();
        return; // clean feed with zero mentions: keep the section hidden
      }
      newsSection.hidden = false;
      newsItems.slice(0, NEWS_HOME).forEach(function (it, i) {
        var row = newsRow(it);
        row.setAttribute('data-anim', 'fade');
        row.setAttribute('data-delay', String(i * 90));
        newsList.appendChild(row);
        watchAnim(row);
      });
      buildModalNodes();
    }).catch(newsUnavailable);
  }

  function openNewsModal() {
    newsModal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!newsCursor) renderNewsChunk();
    // fill until the panel is scrollable (or the feed is exhausted)
    while (newsCursor < newsNodes.length && newsBody.scrollHeight <= newsBody.clientHeight + 200) renderNewsChunk();
    var close = $('#news-close');
    if (close) close.focus();
  }
  function closeNewsModal() {
    newsModal.hidden = true;
    document.body.style.overflow = '';
  }

  if (newsAllBtn) newsAllBtn.addEventListener('click', openNewsModal);
  if (newsModal) {
    $('#news-close').addEventListener('click', closeNewsModal);
    $('#news-scrim').addEventListener('click', closeNewsModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !newsModal.hidden) closeNewsModal();
    });
    newsBody.addEventListener('scroll', function () {
      if (newsBody.scrollTop + newsBody.clientHeight > newsBody.scrollHeight - 600) renderNewsChunk();
    }, { passive: true });
  }
  loadNews();

  /* ============ scroll pass (single rAF-throttled driver) ============ */

  var progressBar = $('#progress');
  var raf = null;

  function pass() {
    var vh = window.innerHeight, sy = window.scrollY || 0;
    if (progressBar) {
      var dh = document.documentElement.scrollHeight - vh;
      progressBar.style.width = (dh > 0 ? (sy / dh) * 100 : 0) + '%';
    }
    if (heroMedia && !reduced) {
      var z = Math.min(1, sy / vh);
      heroMedia.style.transform = 'scale(' + (1.02 + z * 0.1).toFixed(4) + ')';
    }
    if (!reduced) $$('[data-parallax]').forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var f = parseFloat(el.getAttribute('data-pfactor') || '0.06');
      el.style.transform = 'translateY(' + (((r.top + r.height / 2) - vh / 2) * -f).toFixed(1) + 'px)';
    });
    // catch-up: reveal anything the observer missed (fast scroll, scroll restoration on reload)
    if (pending && pending.size) {
      pending.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92) reveal(el);
      });
    }
    if (anatomyWrap) {
      var ar = anatomyWrap.getBoundingClientRect();
      var total = ar.height - vh;
      var ap = total > 0 ? Math.min(1, Math.max(0, -ar.top / total)) : 0;
      updateAnatomy(Math.min(2, Math.floor(ap * 3)), ap);
    }
    deckPass(vh);
  }

  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = null; pass(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  pass();

  // QA hook: lets automated tests drive the scroll pass directly (rAF is
  // throttled in headless/occluded panes, which would otherwise stall checks).
  window.__mtnPass = pass;
})();
