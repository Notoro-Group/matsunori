#!/usr/bin/env node
/* Bake the press archive: fetch Google News + Bing News RSS for "matsunori",
   resolve Google's opaque article tokens to publisher URLs, scrape each
   article's og:image / og:description, and write the result to
   public/data/news-baked.json.

   The bake merges into the previous news-baked.json: items that have dropped
   out of the feeds stay in the archive, and already-resolved metadata is kept
   when a publisher refuses a re-scrape. That makes it safe to run from
   datacenter egress (GitHub Actions) — a partially-blocked run can only add,
   never lose. Best results still come from a residential connection, where
   Google's resolver and more publishers respond.

   Usage: node scripts/bake-news.mjs   (then commit + deploy)
   Optional: scripts/news-fixups.json — [{match, exact?, url?, image?,
   snippet?}] applied to feed items by title substring, for stories whose
   publishers refuse resolution or scraping. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/data/news-baked.json');
const FIXUPS = join(ROOT, 'scripts/news-fixups.json');

const GOOGLE_URL = 'https://news.google.com/rss/search?q=%22matsunori%22&hl=en-US&gl=US&ceid=US:en';
const BING_URL = 'https://www.bing.com/news/search?q=%22matsunori%22&format=rss&mkt=en-US';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const FB_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

const field = (block, tag) => {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>'));
  return m ? m[1].trim() : '';
};
const cdata = (s) => { const m = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/); return m ? m[1] : s; };
const decodeEntities = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');
const isGoogle = (u) => /news\.google\.com/.test(u || '');
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return null; } };
const isMsn = (u) => { const h = hostOf(u) || ''; return h === 'msn.com' || h.endsWith('.msn.com'); };
const titleKey = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, ua = UA, accept = 'text/html') {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': ua, accept, 'accept-language': 'en-US,en;q=0.9' },
  });
  return r;
}

async function fromGoogle() {
  const r = await get(GOOGLE_URL, UA, 'application/rss+xml, application/xml');
  if (!r.ok) throw new Error('google rss ' + r.status);
  const xml = await r.text();
  const items = [];
  for (const block of xml.match(/<item>[\s\S]*?<\/item>/g) || []) {
    const srcM = block.match(/<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/);
    const source = srcM ? decodeEntities(srcM[2]).trim() : null;
    let title = decodeEntities(cdata(field(block, 'title')));
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(' - ' + source).length).trim();
    const gLink = cdata(field(block, 'link'));
    const pub = cdata(field(block, 'pubDate'));
    if (title && gLink) items.push({ title, url: gLink, gLink, source, date: pub ? new Date(pub).toISOString() : null });
  }
  return items;
}

async function fromBing() {
  const r = await get(BING_URL, UA, 'application/rss+xml, application/xml');
  if (!r.ok) throw new Error('bing rss ' + r.status);
  const xml = await r.text();
  const items = [];
  for (const block of xml.match(/<item>[\s\S]*?<\/item>/g) || []) {
    const title = decodeEntities(cdata(field(block, 'title')));
    let url = decodeEntities(cdata(field(block, 'link')));
    const um = url.match(/[?&]url=([^&]+)/);
    if (um) { try { url = decodeURIComponent(um[1]); } catch {} }
    const pub = cdata(field(block, 'pubDate'));
    const source = decodeEntities(field(block, 'News:Source')).replace(/\s+on MSN$/i, '').trim() || null;
    const desc = decodeEntities(cdata(field(block, 'description'))).replace(/<[^>]+>/g, '').trim();
    if (title && url) items.push({ title, url, source, date: pub ? new Date(pub).toISOString() : null, snippet: desc || null });
  }
  return items;
}

async function resolveGoogle(gLink) {
  const idM = (gLink || '').match(/articles\/([^?/]+)/);
  if (!idM) return null;
  const artId = idM[1];
  const pg = await get('https://news.google.com/articles/' + artId);
  if (!pg.ok) return null;
  const stub = await pg.text();
  const sg = (stub.match(/data-n-a-sg="([^"]+)"/) || [])[1];
  const ts = (stub.match(/data-n-a-ts="([^"]+)"/) || [])[1];
  if (!sg || !ts) return null;
  const inner = '["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"' + artId + '",' + ts + ',"' + sg + '"]';
  const body = 'f.req=' + encodeURIComponent(JSON.stringify([[['Fbv4je', inner, null, 'generic']]]));
  const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', 'user-agent': UA },
    body,
  });
  if (!r.ok) return null;
  const text = await r.text();
  try {
    const line = text.substring(text.indexOf('[['));
    let arr;
    try { arr = JSON.parse(line.split('\n')[0]); } catch { arr = JSON.parse(line); }
    const payload = JSON.parse(arr[0][2]);
    const url = payload && payload[1];
    if (typeof url === 'string' && /^https?:/.test(url) && !isGoogle(url)) return url;
  } catch {}
  return null;
}

function ogMeta(html, prop) {
  const a = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']og:' + prop + '["\'][^>]*content=["\']([^"\']+)', 'i'));
  if (a) return a[1];
  const b = html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']og:' + prop + '["\']', 'i'));
  return b ? b[1] : null;
}

async function scrape(url) {
  for (const ua of [UA, FB_UA]) {
    try {
      const r = await get(url, ua);
      if (!r.ok) continue;
      const html = (await r.text()).slice(0, 400000);
      const img = ogMeta(html, 'image');
      const desc = ogMeta(html, 'description');
      const site = ogMeta(html, 'site_name');
      const pub = (html.match(/<meta[^>]+property=["']article:published_time["'][^>]*content=["']([^"']+)/i) || [])[1];
      if (img || desc) {
        return {
          finalUrl: r.url,
          image: img ? new URL(decodeEntities(img), r.url).href : null,
          snippet: desc ? decodeEntities(desc) : null,
          site: site ? decodeEntities(site) : null,
          published: pub || null,
        };
      }
    } catch {}
  }
  return null;
}

const byKey = new Map();
function addItem(it) {
  const k = titleKey(it.title);
  if (!k) return;
  const prev = byKey.get(k);
  if (!prev) { byKey.set(k, it); return; }
  if (!prev.gLink && it.gLink) prev.gLink = it.gLink;
  if (!prev.snippet && it.snippet) prev.snippet = it.snippet;
  if (!prev.source && it.source) prev.source = it.source;
  if (!prev.date && it.date) prev.date = it.date;
  if ((isGoogle(prev.url) || isMsn(prev.url)) && it.url && !isGoogle(it.url) && !isMsn(it.url)) prev.url = it.url;
}

const report = [];
// seed from the previous bake FIRST so its resolved URLs/metadata win the
// dedupe and feed rows only fill in what's missing (gLink, fresher dates)
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    (prev.items || []).forEach(addItem);
    console.log('previous bake: ' + byKey.size + ' items');
  } catch (e) { console.log('previous bake unreadable: ' + e.message); }
}
try {
  const bing = await fromBing();
  bing.forEach(addItem);
  console.log('bing feed: ' + bing.length + ' items');
} catch (e) { console.log('bing feed failed: ' + e.message); }
try {
  const goog = await fromGoogle();
  goog.forEach(addItem);
  console.log('google feed: ' + goog.length + ' items');
} catch (e) { console.log('google feed failed: ' + e.message); }

// hand-maintained fixups first — they spare the Google resolver round-trips
if (existsSync(FIXUPS)) {
  for (const f of JSON.parse(readFileSync(FIXUPS, 'utf8'))) {
    const m = titleKey(f.match);
    for (const it of byKey.values()) {
      const k = titleKey(it.title);
      if (f.exact ? k === m : k.includes(m)) {
        if (f.url) it.url = f.url;
        if (f.image) { it.image = f.image; it.fixedImage = true; }
        if (f.snippet) it.snippet = f.snippet;
      }
    }
  }
}

// resolve remaining opaque / syndicated links via Google (politely, sequentially)
for (const it of byKey.values()) {
  if ((isGoogle(it.url) || isMsn(it.url)) && it.gLink) {
    const real = await resolveGoogle(it.gLink);
    if (real) { it.url = real; report.push('resolved: ' + it.title.slice(0, 50)); }
    else report.push('UNRESOLVED (google): ' + it.title.slice(0, 50));
    await sleep(1500);
  }
}

// scrape article metadata for every reachable publisher URL
const finalize = (it) => ({ title: it.title, url: it.url, source: it.source, date: it.date || null, image: it.image || null, imageType: it.image ? 'article' : null, snippet: it.snippet || null });
const items = [];
for (const it of byKey.values()) {
  if (isGoogle(it.url)) { report.push('skipped (opaque): ' + it.title.slice(0, 50)); continue; }
  if (it.image && it.snippet && it.source && it.date) { items.push(finalize(it)); continue; } // complete from a prior bake
  const meta = await scrape(it.url);
  if (meta) {
    if (meta.finalUrl && !isGoogle(meta.finalUrl)) it.url = meta.finalUrl;
    if (meta.image && !/BB10piIP/i.test(meta.image) && !it.fixedImage) it.image = meta.image;
    if (meta.snippet && !it.snippet) it.snippet = meta.snippet;
    if (!it.source && meta.site) it.source = meta.site;
    if (!it.date && meta.published) { const d = new Date(meta.published); if (!isNaN(d)) it.date = d.toISOString(); }
  } else {
    report.push('no og meta: ' + (it.title || it.url).slice(0, 50));
  }
  if (!it.source) it.source = hostOf(it.url);
  items.push(finalize(it));
  await sleep(400);
}

items.sort((a, z) => ((a.date || '') < (z.date || '') ? 1 : -1));
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), items }, null, 1));
console.log('\n' + report.join('\n'));
console.log('\nwrote ' + items.length + ' items -> ' + OUT);
console.log('with image: ' + items.filter((i) => i.image).length + ', with snippet: ' + items.filter((i) => i.snippet).length);
