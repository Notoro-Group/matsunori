/* matsunori — Worker: static assets + /api/news (live press mentions).
   The news endpoint proxies Google News RSS for "Matsunori", resolves each
   item's real article URL and og:image / og:description (first 15 words are
   truncated client-side), and caches the assembled JSON at the edge. */

const FEED_URL = 'https://news.google.com/rss/search?q=%22matsunori%22&hl=en-US&gl=US&ceid=US:en';
const BING_URL = 'https://www.bing.com/news/search?q=%22matsunori%22&format=rss&mkt=en-US';
const CACHE_SECONDS = 14400; // 4h — press cadence, not a ticker
const ENRICH_LIMIT = 10;     // resolve+og-scrape at most N articles per rebuild
                             // (up to 4 subrequests each — stay inside the 50/request budget)
const MAX_ITEMS = 60;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const FB_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/news') return news(request, ctx);
    return env.ASSETS.fetch(request);
  },
};

async function news(request, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/api/news?v=7', request.url));
  const hit = await cache.match(key);
  if (hit) return hit;

  let body, ttl = CACHE_SECONDS;
  try {
    body = await buildFeed();
  } catch (err) {
    body = { error: 'feed-unavailable', detail: String((err && err.message) || err), items: [] };
    ttl = 300; // transient failure: retry soon
  }
  const res = new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=900, s-maxage=' + ttl,
    },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/* Google News has the best coverage but 503s datacenter egress at times;
   Bing News RSS carries real publisher URLs and snippets inline. Fetch both,
   merge and dedupe by title, then og-scrape the publisher pages — article
   og:image is the same thumbnail Google News itself displays. */
async function buildFeed() {
  const [g, b] = await Promise.allSettled([fromGoogle(), fromBing()]);
  const gi = g.status === 'fulfilled' ? g.value : null;
  const bi = b.status === 'fulfilled' ? b.value : null;
  if (!gi && !bi) throw (g.status === 'rejected' ? g.reason : new Error('no feeds'));

  // bing first: on a title collision its copy wins — it already carries a
  // publisher URL and snippet — but adopt the google copy's resolver token
  // (and source name) so enrichment can still reach the original article
  // when bing hands us a syndicated msn.com link
  const byKey = new Map();
  for (const it of [...(bi || []), ...(gi || [])]) {
    const k = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!k) continue;
    const prev = byKey.get(k);
    if (!prev) { byKey.set(k, it); continue; }
    if (!prev.gLink && it.gLink) prev.gLink = it.gLink;
    if (!prev.sourceUrl && it.sourceUrl) prev.sourceUrl = it.sourceUrl;
    if (!prev.snippet && it.snippet) prev.snippet = it.snippet;
    if (!prev.source && it.source) prev.source = it.source;
  }
  const items = [...byKey.values()];
  items.sort((a, z) => ((a.date || '') < (z.date || '') ? 1 : -1));

  await Promise.allSettled(items.slice(0, ENRICH_LIMIT).map(enrich));

  for (const it of items) {
    if (!it.image) {
      // fall back to the publisher favicon (rendered small, not as a cover);
      // for google/msn links prefer the original outlet's domain
      const host = hostOf(!isGoogle(it.url) && !isMsn(it.url) ? it.url : it.sourceUrl || it.url);
      if (host) {
        it.image = 'https://www.google.com/s2/favicons?domain=' + host + '&sz=128';
        it.imageType = 'favicon';
      }
    }
    delete it.gLink;
    delete it.sourceUrl;
  }
  return {
    updated: new Date().toISOString(),
    query: 'matsunori',
    via: [gi && 'google', bi && 'bing'].filter(Boolean).join('+'),
    items,
  };
}

async function fromBing() {
  const r = await fetch(BING_URL, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml' },
  });
  if (!r.ok) throw new Error('bing ' + r.status);
  const xml = await r.text();
  const items = [];
  const seen = new Set();
  for (const block of (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, MAX_ITEMS)) {
    const title = decodeEntities(cdata(field(block, 'title')));
    let url = decodeEntities(cdata(field(block, 'link')));
    const um = url.match(/[?&]url=([^&]+)/); // bing apiclick wrapper
    if (um) { try { url = decodeURIComponent(um[1]); } catch (e) { /* keep wrapper */ } }
    const pub = cdata(field(block, 'pubDate'));
    const source = decodeEntities(field(block, 'News:Source')).replace(/\s+on MSN$/i, '').trim() || null;
    // Bing's News:Image thumbnails are unreliable for syndicated items —
    // og:image from the article itself (via enrich) is what Google News shows
    const desc = decodeEntities(cdata(field(block, 'description'))).replace(/<[^>]+>/g, '').trim();
    const dedupe = title.toLowerCase();
    if (!title || !url || seen.has(dedupe)) continue;
    seen.add(dedupe);
    items.push({
      title,
      url,
      source,
      date: pub ? new Date(pub).toISOString() : null,
      image: null,
      imageType: null,
      snippet: desc || null,
    });
  }
  return items;
}

async function fromGoogle() {
  const r = await fetch(FEED_URL, {
    headers: {
      'user-agent': UA,
      accept: 'application/rss+xml, application/xml, text/xml',
      'accept-language': 'en-US,en;q=0.9',
    },
  });
  if (!r.ok) throw new Error('rss ' + r.status);
  const xml = await r.text();

  const items = [];
  const seen = new Set();
  for (const block of (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, MAX_ITEMS)) {
    const srcM = block.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/);
    const sourceUrl = srcM ? srcM[1] : null;
    const source = srcM ? decodeEntities(srcM[2]).trim() : null;
    let title = decodeEntities(cdata(field(block, 'title')));
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(' - ' + source).length).trim();
    const gLink = cdata(field(block, 'link'));
    const pub = cdata(field(block, 'pubDate'));
    const dedupe = title.toLowerCase();
    if (!title || !gLink || seen.has(dedupe)) continue;
    seen.add(dedupe);
    items.push({
      title,
      url: decodeGoogleLink(gLink),
      gLink,
      source,
      sourceUrl,
      date: pub ? new Date(pub).toISOString() : null,
      image: null,
      imageType: null,
      snippet: null,
    });
  }
  return items;
}

/* Resolve the publisher URL, then scrape og:image / og:description.
   Failures at any step simply leave the fallbacks in place. */
async function enrich(it) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    // resolve opaque google links, and upgrade syndicated msn copies to the
    // original publisher when we hold a google resolver token for the story
    if ((isGoogle(it.url) || isMsn(it.url)) && it.gLink) {
      const real = await resolveViaBatch(it.gLink, ctrl.signal);
      if (real) it.url = real;
    }
    if (isGoogle(it.url)) return; // opaque link we couldn't resolve
    const meta = await fetchArticleMeta(it.url, ctrl.signal);
    if (!meta) return;
    if (meta.finalUrl && !isGoogle(meta.finalUrl)) it.url = meta.finalUrl;
    if (meta.img && !/BB10piIP/i.test(meta.img)) { // msn's generic mosaic
      try {
        it.image = new URL(meta.img, meta.finalUrl || it.url).href;
        it.imageType = 'article';
      } catch (e) { /* unresolvable relative URL */ }
    }
    if (meta.desc) it.snippet = decodeEntities(meta.desc);
  } catch (err) {
    /* timeout / blocked fetch — fallbacks apply */
  } finally {
    clearTimeout(timer);
  }
}

/* Some publishers (Advance Local, NBC O&O) 403 generic bots but serve link
   previews — retry with the Facebook crawler UA before giving up. */
async function fetchArticleMeta(url, signal) {
  for (const ua of [UA, FB_UA]) {
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        signal,
        headers: { 'user-agent': ua, accept: 'text/html', 'accept-language': 'en-US,en;q=0.9' },
      });
      if (!r.ok) continue;
      const html = (await r.text()).slice(0, 300000);
      const img = ogMeta(html, 'image');
      const desc = ogMeta(html, 'description');
      if (img || desc) return { img, desc, finalUrl: r.url };
    } catch (e) { /* try next UA */ }
  }
  return null;
}

/* Newer Google News links are opaque tokens. The article stub page carries a
   signature + timestamp that the DotsSplashUi batchexecute endpoint exchanges
   for the real URL (same flow the Google News web app uses). */
async function resolveViaBatch(gLink, signal) {
  const idM = (gLink || '').match(/articles\/([^?/]+)/);
  if (!idM) return null;
  const artId = idM[1];
  const pg = await fetch('https://news.google.com/articles/' + artId, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    signal,
  });
  if (!pg.ok) return null;
  const stub = await pg.text();
  const sg = (stub.match(/data-n-a-sg="([^"]+)"/) || [])[1];
  const ts = (stub.match(/data-n-a-ts="([^"]+)"/) || [])[1];
  if (!sg || !ts) return null;
  const inner = '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"' + artId + '",' + ts + ',"' + sg + '"]';
  const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]]));
  const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'user-agent': UA,
    },
    body,
    signal,
  });
  if (!r.ok) return null;
  const text = await r.text();
  try {
    const line = text.substring(text.indexOf('[['));
    let arr;
    try { arr = JSON.parse(line.split('\n')[0]); } catch (e) { arr = JSON.parse(line); }
    const payload = JSON.parse(arr[0][2]);
    const url = payload && payload[1];
    if (typeof url === 'string' && /^https?:/.test(url) && !isGoogle(url)) return url;
  } catch (e) { /* response shape changed */ }
  return null;
}

/* Google News /rss/articles/ links base64-encode the target URL; decode when
   possible so links (and og scrapes) go straight to the publisher. */
function decodeGoogleLink(link) {
  const m = link.match(/news\.google\.com\/(?:rss\/)?articles\/([^?/]+)/);
  if (!m) return link;
  try {
    const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
    const urls = (bin.match(/https?:\/\/[^\x00-\x20"\\\x7f-\xff]+/g) || [])
      .filter((u) => !/news\.google\.com/.test(u));
    if (urls.length) {
      const nonAmp = urls.filter((u) => !/\/amp\b|[.-]amp\./i.test(u));
      return (nonAmp[0] || urls[0]);
    }
  } catch (e) { /* newer opaque format — keep the Google link */ }
  return link;
}

function ogMeta(html, prop) {
  const a = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']og:' + prop + '["\'][^>]*content=["\']([^"\']+)', 'i'));
  if (a) return a[1];
  const b = html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']og:' + prop + '["\']', 'i'));
  return b ? b[1] : null;
}

function field(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'));
  return m ? m[1].trim() : '';
}

function cdata(s) {
  const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : s;
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
}

function isGoogle(u) {
  return /news\.google\.com/.test(u || '');
}

function isMsn(u) {
  const h = hostOf(u) || '';
  return h === 'msn.com' || h.endsWith('.msn.com');
}

function hostOf(u) {
  try { return new URL(u).hostname; } catch (e) { return null; }
}
