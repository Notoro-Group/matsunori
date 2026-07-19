/* matsunori — location pages: live hours, today highlight, sticky quick bar,
   themed map. Runs alongside main.js (nav pill, reveals, loader). */

(function () {
  'use strict';

  var LOC = document.body.getAttribute('data-loc'); // 'fenway' | 'lic'
  if (!LOC) return;
  var UNI = '#D9A441', STEAM = '#8A8578', AKAMI = '#B33A32';

  function nycNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })); }
  function fmtMin(min) {
    var h = Math.floor(min / 60), mm = min % 60, ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap;
  }

  var SCHEDULES = {
    fenway: function (day) {
      return day === 0 ? [[690, 840], [960, 1320]] // Sun 11:30–2:00, 4:00–10:00
        : day === 6 ? [[690, 840], [960, 1350]]    // Sat 11:30–2:00, 4:00–10:30
        : day === 5 ? [[1020, 1350]]            // Fri 5:00–10:30 PM
        : [[1020, 1320]];                       // Mon–Thu 5:00–10:00 PM
    },
    lic: function () { return [[1020, 1350]]; } // daily 5:00–10:30 PM
  };

  function status() {
    var d = nycNow(), day = d.getDay(), m = d.getHours() * 60 + d.getMinutes();
    var spans = SCHEDULES[LOC](day), i;
    for (i = 0; i < spans.length; i++) {
      if (m >= spans[i][0] && m < spans[i][1]) return { state: 'open', label: 'OPEN NOW — CLOSES ' + fmtMin(spans[i][1]) };
    }
    for (i = 0; i < spans.length; i++) {
      if (m < spans[i][0]) {
        var midday = i > 0; // between two spans on the same day
        return {
          state: midday ? 'break' : 'closed',
          label: (midday ? 'BETWEEN SERVICES — REOPENS ' : 'CLOSED — OPENS ') + fmtMin(spans[i][0]),
        };
      }
    }
    var next = SCHEDULES[LOC]((day + 1) % 7);
    return { state: 'closed', label: 'CLOSED — OPENS ' + fmtMin(next[0][0]) + ' TOMORROW' };
  }

  var statusEls = document.querySelectorAll('[data-loc-status]');
  var dotEls = document.querySelectorAll('[data-loc-dot]');
  var barStatus = document.querySelector('[data-bar-status]');

  function renderStatus() {
    var s = status();
    var color = s.state === 'open' ? UNI : s.state === 'break' ? AKAMI : STEAM;
    statusEls.forEach(function (el) { el.textContent = s.label; el.style.color = color; });
    dotEls.forEach(function (el) {
      el.style.background = color;
      el.style.animation = s.state === 'open' ? 'mtnPulse 2.4s ease-in-out infinite' : 'none';
    });
    if (barStatus) {
      barStatus.textContent = s.state === 'open' ? s.label.replace('OPEN NOW — CLOSES', 'OPEN · TIL') : s.label;
      barStatus.style.color = color;
    }
    var day = nycNow().getDay();
    document.querySelectorAll('[data-day]').forEach(function (row) {
      var days = row.getAttribute('data-day').split(',').map(Number);
      row.classList.toggle('today', days.indexOf(day) !== -1);
    });
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* sticky quick bar once the header scrolls away (mobile) */
  var bar = document.getElementById('loc-bar');
  var head = document.querySelector('.loc-head');
  if (bar && head) {
    var onScroll = function () {
      bar.classList.toggle('show', window.scrollY > head.offsetTop + head.offsetHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* themed map: Leaflet + CARTO dark tiles, uni pin */
  var mapEl = document.getElementById('loc-map');
  if (mapEl && window.L) {
    var lat = parseFloat(mapEl.getAttribute('data-lat'));
    var lng = parseFloat(mapEl.getAttribute('data-lng'));
    var map = L.map(mapEl, { center: [lat, lng], zoom: 16, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" rel="noopener" target="_blank">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'map-pin',
        html: '<span class="map-pin-ring"></span><span class="map-pin-dot"></span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
      keyboard: false,
    }).addTo(map);
  }
})();
