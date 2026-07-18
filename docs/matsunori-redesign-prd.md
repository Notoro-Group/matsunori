# Matsunori.com Redesign — Product Requirements Document

**Version:** 1.0 · July 2026
**Prepared for:** Claude Design (mockup phase)
**Scope:** Full site redesign — Home, Location pages (Fenway, LIC), Menu, supporting pages
**Platform:** No constraint. Assume custom build (Next.js + GSAP/Framer Motion, optional WebGL).

---

## 1. Background

Matsunori is a temaki (handroll) bar with locations in Boston (Fenway) and NYC (Long Island City), rated among Boston's top restaurants. The concept is deliberately simple — exceptional handrolls, served one at a time — but the current Framer site reads as generic and template-driven, badly undercutting how the restaurant actually feels: precise, warm, quietly luxurious.

**The content is right. The presentation is wrong.** This redesign keeps existing copy, photography, and video, and rebuilds the visual language, layout, and motion around it.

What the brand actually has going for it (all currently buried):

- A genuinely distinctive product philosophy: 50/50 rice-to-fish ratio, house-made soy sauce, nori kept crisp by serving one roll at a time
- Uni flown overnight from Hokkaido; A5 Wagyu sourced directly from Wagyu Master (S Foods Inc.) with authenticated certificates displayed in-store
- Press (Thrillist) and strong food photography/video
- An approachable, even playful identity ("sushi tacos") that keeps the high-end feel human

## 2. Goals

1. **Perception shift:** first-time visitors should read Matsunori as a top-tier destination within 3 seconds of landing — before reading a word.
2. **Craft as content:** the site's motion and detail should mirror the restaurant's precision. The site itself is evidence of the standard.
3. **Practical clarity:** walk-in-only model means the site's #1 utility job is *hours, location, and what to expect*. This must never be sacrificed to aesthetics.
4. **Kill the amateur signals:** Google Drive PDF menu embeds, invalid press dates, duplicate sections, default Google Maps embeds — all gone.
5. **Mobile-first excellence:** most diners will check this site on a phone, standing on a sidewalk deciding where to eat. The mobile experience is the primary experience, not an adaptation.

**Success looks like:** an Awwwards/FWA-caliber site that a chef would be proud of and a hungry person can use in 10 seconds.

## 3. Audience

- **The decider on the sidewalk (primary, mobile):** "Is this worth the line? Are they open? Where exactly?"
- **The planner (desktop/mobile):** researching for a date or visiting foodie friend; wants menu, vibe, press validation.
- **The connoisseur:** cares about sourcing — uni provenance, wagyu certification, temaki technique. Currently the wagyu section serves them; elevate it.
- **Press & industry:** needs imagery, story, contact fast.

---

## 4. Creative Concept — "One Roll at a Time"

The restaurant serves each roll individually so the nori stays crisp. The site adopts the same philosophy: **one idea per screen, delivered at its peak.** No walls of content, no crowded grids. Each scroll movement serves a single, composed moment — then hands you the next.

Three sub-principles:

**Crisp, not soft.** The nori crunch is the brand's signature sensation. Translate it: hard-edged transitions, decisive snaps at the end of eased motion, sharp typography, no blur-heavy or dreamy effects. Motion should feel like a knife cut, not a fade.

**The 50/50 ratio as a visual system.** Their defining product claim — equal rice and fish — becomes the compositional grid. Half-and-half layouts recur throughout: image/text splits at exactly 50/50, a horizon line that persists across sections, even the loading state (see §7.1). It's a brand truth expressed structurally, and it gives the whole site a recognizable geometry.

**Counter seat perspective.** Dark room, spotlit food, the chef's hands in frame. Photography and video are treated like they're lit by a single warm lamp over the counter. The interface recedes; the food glows.

## 5. Art Direction

### 5.1 Palette — "Ink & Rice"

| Token | Color | Use |
|---|---|---|
| `ink` | #0C0C0E (near-black, slightly warm) | Primary canvas |
| `nori` | #14171A (deep green-black) | Elevated surfaces, cards |
| `rice` | #F4EFE6 (warm off-white) | Primary text, light sections |
| `steam` | #8A8578 (warm gray) | Secondary text, captions |
| `uni` | #D9A441 (muted gold) | Accent: links, hover states, active indicators, "open now" |
| `akami` | #B33A32 (lacquer red) | Rare, intentional: one accent per page max (e.g., the hanko-style seal, wagyu section moments) |

Rules: never pure #000 or #FFF. `uni` gold is the only interactive accent. `akami` red is ceremonial — used like a hanko stamp, not a UI color. Photography provides all other color; the UI stays monastic so the food carries saturation.

### 5.2 Typography

- **Display serif** (headlines, editorial moments): high-contrast, slightly sharp serif — Canela, Ogg, or Editorial New territory. Set large: 8–12vw hero sizes, tight leading.
- **Grotesk** (UI, body, nav): Suisse Int'l / Neue Haas / Söhne territory. Wide tracking for small caps labels (`HOURS`, `FENWAY`, `PRESS`).
- **Japanese accent type:** Mincho-style (e.g., Zen Old Mincho / Noto Serif JP) for vertical-set accents — e.g., 手巻き (temaki) running vertically beside sections, マツノリ in the footer. **Note: all Japanese text must be validated by the client before ship; use only confirmed vocabulary (手巻き, 海苔, 雲丹, 和牛) in mockups.**
- **Tabular mono** (small): hours tables, wagyu certificate IDs, coordinates — a quiet "documentation" voice that reinforces authenticity (e.g., `43.0642° N — HOKKAIDO`).

### 5.3 Texture & materials

- Subtle nori-sheet texture (2–3% opacity grain, irregular fiber pattern) on `ink` backgrounds — visible only on close look, like lacquerware.
- Thin 1px rules in `steam` for structure — evokes menu cards and shoji framing. No drop shadows anywhere; depth comes from light in the photography, not CSS.
- A red circular seal (hanko) containing "松" or the Matsunori mark — used once per page as a signature, e.g., stamped beside the footer wordmark with a slight rotation.

---

## 6. Site Map

```
/                     Home (brand story, the flagship experience)
/fenway               Boston location: hours, map, menu, FAQ
/lic                  NYC location: hours, map, menu, FAQ
                      (currently doesn't exist — the live site's LIC link
                      dead-ends at the homepage; this redesign fixes that)
/menu                 Full interactive menu (linked from both locations)
/404                  On-brand error page (a dropped roll; playful, minimal)
```

Persistent elements: minimal fixed nav (wordmark left; Locations, Menu, Story right; hamburger on mobile), footer with locations, socials, affiliates (Mai Izakaya, Notoro Group), and the hanko seal.

**Nav detail — the "open now" pip:** a small `uni`-gold dot beside "Locations" in the nav, computed live from each location's hours. Tapping opens a two-row panel: `FENWAY — OPEN · closes 10:00 PM` / `LIC — OPEN · closes 10:30 PM`. This is the single highest-utility feature for the walk-in model.

---

## 7. Page-by-Page Specification

### 7.1 Loading / entry (all pages, first visit per session)

A 50/50 horizontal split — top half `ink`, bottom half `rice` — with the wordmark centered on the seam. As assets load, the seam line draws across the screen; on completion the two halves part like a nori sheet being lifted, revealing the hero. Total budget: ≤ 1.2s, skipped entirely on repeat visits and under `prefers-reduced-motion`. Never gate content behind a vanity loader.

### 7.2 Home

**Section 1 — Hero.** Full-viewport, existing banner video re-graded darker/warmer, with a subtle vignette so it sits inside the `ink` canvas rather than pasted on top. Overlaid: "MATSUNORI" in display serif at massive scale, characters staggering in with a sharp rise-and-settle (crisp, 400ms, no bounce). Below, small caps: `HANDROLL BAR — BOSTON · NEW YORK`. Kanji/katakana accent set vertically along the right edge. A thin scroll cue line at bottom center that draws downward on loop.
*Mobile:* video swaps to a lighter-weight vertical crop or poster frame + slow Ken Burns per connection speed; type scales to fill width edge-to-edge.

**Section 2 — The Anatomy of a Handroll (signature scroll moment).** The showpiece. A pinned, scroll-driven sequence deconstructing one handroll against the dark canvas:

1. A single sheet of nori floats centered — caption: `NORI — toasted to order. Served in 30 seconds, before it softens.`
2. Scroll: rice layers on — `RICE — half the roll. Not filler.` The 50/50 claim appears as a drawn diagram line splitting the composition.
3. Scroll: the fish — `CHUTORO / UNI / WAGYU` cycling — `flown from Hokkaido overnight` in tabular mono with a drawn route arc (Hokkaido → BOS).
4. Scroll: the roll closes, rotates once, and a final caption stamps in: `Served one at a time. Eaten by hand.`

Implementation: layered high-res cutout photography or a short scroll-scrubbed video sequence (preferred over full WebGL for realism — food must look like food, not CGI). This section IS the pitch; give it 4 viewport-heights of scroll.
*Mobile:* identical sequence, shorter scroll distance, tap-through fallback if scroll-scrub performance drops below 60fps.

**Section 3 — The Story.** Existing "Savoring Artistry" copy, re-edited into 4–5 short passages presented one at a time (per the concept): each paragraph occupies a 50/50 split with a supporting gallery image, alternating sides. Text reveals line-by-line with a masked rise as it enters. Sentences worth elevating get pulled out as oversized serif pull-quotes: *"We've flipped that standard."*

**Section 4 — The Wagyu Dossier.** Reframe the wagyu/certification content as a *dossier* — this is the connoisseur's section and the brand's best proof. Dark section, mono-type labels: partner (`WAGYU MASTER — S FOODS INC.`), traceability (`LINEAGE VERIFIED — JAPAN NATIONAL SYSTEM`), grade (`A5 — JAPAN MEAT GRADING ASSOC.`). The three certificate scans presented as physical documents on the dark surface — slight paper texture, hover/tap lifts one toward the viewer to full legibility. Include the line "ask to see them at our counter — they're always on display." Embed the existing YouTube feature (cLKCDaNRHW0) as a stilled poster frame that expands to a lightbox player.
Optional `akami` moment: the A5 grade rendered as a stamped red seal that presses in on scroll.

**Section 5 — Press.** Fix the broken "Invalid Date." Thrillist quote set enormous in display serif — treat the quote as the section, with the outlet name in small caps beneath. Built as a system that can hold future outlets (horizontal snap-scroll of quotes if >1). No screenshots-of-articles imagery.

**Section 6 — Gallery.** Replace the repeating carousel with a full-bleed horizontal scroll strip (scroll-jacked on desktop within the pinned section; natural swipe on mobile) — images at varying heights on the shared 50/50 horizon line. Each image reveals with a clip-path wipe. Tap to lightbox.

**Section 7 — Locations / closing CTA.** The decision point. Two 50/50 panels — `FENWAY` / `LIC` — each with a location image, live open/closed status in `uni`, tonight's hours, and one-line address. Hovering a panel dims the other. Below: `Walk-ins only. Worth it.` — the brand's confidence, stated once.

**Footer.** Compact: wordmark + hanko seal, locations, Instagram/Yelp/Google links, affiliates, © line. Vertical Japanese accent type on the edge.

### 7.3 Location pages (/fenway, /lic — shared template)

Utility-first; the atmosphere comes from restraint, not spectacle.

1. **Header:** location name huge (`FENWAY`), neighborhood line, live status pill (`OPEN NOW — closes 10:00 PM` in `uni` / `CLOSED — opens 5:00 PM` in `steam`). Location video as a muted, darkened background band — not full-screen.
2. **Hours:** designed as a proper typographic table (mono numerals, serif day labels), not stacked headings. Special rows (Sat/Sun lunch + dinner splits) handled cleanly. Current day highlighted with a `uni` rule. "Kitchen closes 30 min before close" and "Walk-ins only" as footnotes.
3. **Find us:** custom dark-styled map (Mapbox/Google styled to the Ink palette), `uni` pin, one-tap buttons: `DIRECTIONS` / `CALL` / `EMAIL`. Fix the current `email:` href bug → `mailto:`.
4. **Menu preview:** first 6 items from /menu with prices, then `FULL MENU →`. **No PDF embeds anywhere.**
5. **FAQ:** existing Q&A as clean accordions (thin rules, plus→minus rotation, single-open). Keep the "Sushi Tacos!" answer — it's the brand's charm; let it live.

### 7.4 /menu

The single biggest functional upgrade — replacing Google Drive PDFs with a designed, fast, indexable menu.

- Structure: `HANDROLLS` / `COOKED` / `SPECIALS` / `DRINKS` (confirm categories against current PDFs with client — content entry is a client task, structure is ours).
- Each item: name (serif), Japanese name where applicable (mincho), one-line description (grotesk), price (mono, right-aligned on a dotted leader — the classic menu card gesture, modernized).
- Signature items (uni, A5 wagyu, toro) get a small `uni` marker and, on hover/tap, a photograph slides in from the margin — one at a time, per the concept.
- Sticky category rail (left on desktop, horizontal snap-chips on mobile).
- Location toggle if menus differ between Fenway and LIC; printable/PDF-export stylesheet so staff can retire the Drive links entirely.

### 7.5 /404

`ink` page, a single fallen sesame seed or dropped nori sheet, serif line: "This one didn't make it to the counter." → `BACK TO MENU`. Ten-minute build, disproportionate charm.

---

## 8. Motion System

**Global grammar** (consistency is what separates refined from busy):

- **Easing:** custom cubic-bezier with fast attack, firm settle (≈ `0.16, 1, 0.3, 1`). Nothing bouncy, nothing floaty. The "knife cut" feel.
- **Durations:** micro-interactions 150–250ms; reveals 400–600ms; pinned sequences scroll-scrubbed (duration = user-controlled).
- **Reveal vocabulary (use only these four):** masked line rise (text), clip-path wipe (images), draw-in (1px rules, route arcs, diagrams), stamp (scale 1.06→1.0 with 2° rotation settle — reserved for seals/captions).
- **Hover states:** text links get a `uni` underline that draws left→right; images get a ≤1.03 scale with wipe-reveal caption. No glows, no shadows.
- **Scroll:** natural scroll everywhere except the two pinned sequences (Anatomy §7.2-2, Gallery §7.2-6). Never trap the user: pinned sections must release cleanly and be skippable via nav.

**Motion accessibility:** full `prefers-reduced-motion` variant — pinned sequences become static composed frames with captions, reveals become simple fades, loader is skipped. This is a requirement, not a nice-to-have.

## 9. Mobile Experience (primary platform)

- Design mobile comps **first** for Home and Location pages; desktop is the adaptation.
- All 50/50 splits become stacked with the seam line preserved as a visual motif between blocks.
- Anatomy sequence: reduced scroll depth, `will-change` discipline, tap-to-advance fallback.
- Hero video: poster-first, lazy video, respect Save-Data.
- Tap targets ≥ 44px; hours/directions/call reachable within one thumb-scroll of location page top.
- Sticky mini-bar on location pages after scrolling past header: `OPEN NOW · DIRECTIONS · CALL`.
- Test at 360px width minimum; type scale floors: body ≥ 16px, captions ≥ 12px.

## 10. Performance & Accessibility Budgets

- LCP < 2.0s on 4G mobile; CLS < 0.05; total JS < 250KB gz (WebGL, if any, lazy-loaded and non-blocking).
- All video muted/inline/lazy with poster frames; images AVIF/WebP with dark-matched dominant-color placeholders (no white flash on `ink` canvas).
- Contrast: `rice` on `ink` passes AAA; `steam` on `ink` reserved for ≥14px text (AA). `uni` on `ink` verified AA for interactive text.
- Full keyboard navigation incl. pinned sections; focus states styled (uni underline), not suppressed; alt text on all food imagery; FAQ accordions ARIA-correct.
- Semantic HTML menu (huge SEO win over current PDF embeds) + LocalBusiness/Restaurant structured data per location (hours, geo, cuisine) — this alone should visibly improve Google presence.

## 11. Content Inventory

**Reuse as-is:** all About copy (lightly re-edited for the one-at-a-time layout), Thrillist quote, hero + location videos, gallery images (cdn.matsunori.com), wagyu certificates ×3, YouTube feature, hours/FAQ/contact data, affiliate links.

**Client must supply:** menu content as text (items, descriptions, prices — currently locked in PDFs), confirmation of Japanese vocabulary, any LIC-specific hours/FAQ differences, high-res cutout-friendly photography for the Anatomy sequence (or a half-day shoot: nori sheet, rice, 3 fish toppings, finished roll, on black — shot list available on request).

**Fix list from current site:** "Invalid Date" on press card, `email:` → `mailto:` hrefs, duplicate rendered sections, gallery item with broken `<>` src, filename-exposed video URLs ("Banner Video V3 (1) (1).mp4") → clean CDN paths.

## 12. Out of Scope (v1)

Online ordering/takeout (they don't offer it), reservations (walk-in only — a positioning asset, not a gap), CMS build-out (structure content for a future CMS but don't block on it), LIC-specific photography (reuse shared assets until provided).

## 13. Open Questions for Client

1. Menu source of truth: can we get menu text this week? (Blocks §7.4 mockups being real rather than lorem.)
2. Does LIC's schedule/FAQ differ from Fenway's?
3. Any brand assets beyond the site — logo files, existing kanji/katakana treatment, brand fonts?
4. Appetite for the half-day "Anatomy" photo shoot vs. adapting existing shots?

## 14. Handoff Notes for Claude Design

- Mock **mobile and desktop for Home first** — the Anatomy sequence (§7.2-2) is the make-or-break screen set; storyboard it as 4 keyframes.
- Then: /fenway (utility benchmark) and /menu (biggest functional delta).
- Deliver the motion spec as annotated keyframes (before/during/after per reveal type in §8) so the grammar survives into build.
- Use real content everywhere possible (§11); where menu text is pending, use plausible temaki items, never lorem ipsum.
- The test for every screen: *would this feel at home printed as a page in a beautiful cookbook, and can a hungry person on a sidewalk use it in 10 seconds?* Both must be true.
