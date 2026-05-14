---
**Type:** Issue Fix
**Originated by:** Jobs, Carmack, Miyazaki, Taleb
**Sprint:** 0013

## Problem

`index.html` contains exactly five head elements: `<meta charset>`, `<link rel="icon" href="/vite.svg">`, `<meta name="viewport">`, two Google Fonts preconnect/stylesheet links, and `<title>Astral Chart — Birth Chart Reading</title>`. That is the complete set. There is no `<meta name="description">`, no Open Graph tags, no Twitter Card tags, no canonical URL, and no favicon asset that belongs to the product.

The favicon reference at `index.html:5` points to `/vite.svg` — the default placeholder injected by `npm create vite`. The file `/vite.svg` does not exist in the repository at all (the `public/` directory itself is absent). Any browser resolving `/vite.svg` receives a 404. Browsers fall back to no favicon, or in some caching states display the Vite logo cached from a prior request. Either outcome signals "scaffolding, not a finished product" to every user who notices the browser tab.

When a user pastes the app URL into iMessage, WhatsApp, Slack, or Twitter/X, the link-preview crawlers (`facebookexternalhit`, `Twitterbot`, `Slackbot`) read the `<head>` and find nothing actionable. The result is a blank or title-only preview card. For iMessage on iOS, a missing `og:image` means no image card at all — just the URL as text. For Slack, the unfurl shows only the `<title>` value and a gray placeholder. This directly kills the sharing moment that Jobs identifies as the single highest-leverage organic growth event: someone who had a genuine experience wanting to show it to a friend.

No `<meta name="description">` also means Google's search snippet is auto-generated from page body text, which at render time is entirely the pre-render loader markup: the `✦` spinner, "Astral Chart", "Your birth chart, decoded". Search results show that text rather than a crafted description.

Reproduction: paste `https://astralchart.app` (or localhost URL) into the Slack message composer. Observe: no image, no description, title only. Open the browser tab: no favicon or Vite placeholder. Inspect `index.html:5`: `/vite.svg`.

## Expected Behavior

After this fix, a link paste into iMessage, Slack, or Twitter produces a full preview card with title, description, and a recognizable image. The browser tab shows a branded favicon. Search engine result pages show a crafted, human-readable description. Every element is present and accurate before the React bundle mounts — the `<head>` is server-readable by crawlers that do not execute JavaScript.

### Favicon

Replace `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` with a branded SVG favicon placed at `public/favicon.svg`. The favicon should be the `✦` (four-pointed star, U+2736) glyph in gold (`#c9a84c`) centered on a deep charcoal background (`#0a0a0f`), matching the pre-render loader already in `index.html`. A 32×32 viewBox SVG with a filled `rect` at `#0a0a0f` and a `text` element rendering `✦` in `#c9a84c` at `font-size: 22` and `font-family: serif` is sufficient. The `<link>` tag should be:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

No PNG fallback is required for the minimum bar — SVG favicons are supported by all modern browsers.

### `<meta name="description">`

```html
<meta name="description" content="Discover your natal chart — your Sun, Moon, and Rising — and what the sky reveals about love, purpose, and the patterns in your life. Free birth chart readings, daily transits, solar return, and synastry." />
```

The description must not exceed 160 characters for Google's snippet display. It should speak to the person arriving from a search for "free birth chart reading" or "what does my natal chart mean" — not describe features, but name the experience.

### Open Graph tags

```html
<meta property="og:type" content="website" />
<meta property="og:title" content="Astral Chart — Free Birth Chart &amp; Astrology Reading" />
<meta property="og:description" content="Discover your natal chart — your Sun, Moon, and Rising — and what the sky reveals about love, purpose, and the patterns in your life." />
<meta property="og:image" content="https://astralchart.app/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="https://astralchart.app/" />
<meta property="og:site_name" content="Astral Chart" />
```

The OG image (`public/og-image.png`, 1200×630 px) is a required deliverable for this fix. It must be a real asset, not a placeholder or data-URI. Design language: deep charcoal background (`#0a0a0f`) with a subtle radial gradient from deep purple (`#1a0a2e`) at center fading to charcoal at edges, matching the app's body style. A simplified SVG chart wheel — the outer zodiac ring with gold segment borders, inner house lines in soft gold at low opacity — centered in the left two-thirds of the image. In the right third: the `✦` glyph at large scale (`~80px`) in gold (`#c9a84c`), the wordmark "Astral Chart" in Playfair Display at `~36px` in `#e8e6e3`, and the tagline "Your birth chart, decoded" in Inter Light at `~16px` in `#8a8694`. Gold horizontal rules above and below the wordmark. No photography, no gradient overlays that obscure the chart wheel, no sparkle effects. The image should feel like the loading screen already feels: quiet, dark, significant. If generated programmatically (e.g., via a build script using `sharp` or `canvas`), the script should live at `scripts/generate-og-image.mjs` and run as part of the build process.

### Twitter Card tags

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Astral Chart — Free Birth Chart &amp; Astrology Reading" />
<meta name="twitter:description" content="Discover your natal chart — your Sun, Moon, and Rising — and what the sky reveals about love, purpose, and the patterns in your life." />
<meta name="twitter:image" content="https://astralchart.app/og-image.png" />
```

`summary_large_image` is required to produce the large card format in Twitter/X unfurls and iMessage (which uses Twitter Card metadata as a fallback when OG is absent).

### Canonical URL

```html
<link rel="canonical" href="https://astralchart.app/" />
```

Single canonical for the SPA root. This prevents duplicate-content signals if the app is accessible under both `www` and apex variants.

### `<title>` update

The existing title "Astral Chart — Birth Chart Reading" should be updated to "Astral Chart — Free Birth Chart & Astrology Reading" to include the word "Free" (a high-intent search modifier) and "Astrology" (the broader category term). The `og:title` and `twitter:title` tags should use the same string.

### Tag placement

All meta additions go inside `<head>`, after `<meta name="viewport">` and before the Google Fonts `<link>` tags. Charset and viewport must remain first. The canonical `<link>` goes after the favicon `<link>` and before Open Graph tags.

### What not to include

Do not add `og:locale`, `og:image:alt`, Apple touch icon `<link>` tags, `<meta name="robots">`, structured data (`application/ld+json`), or a `manifest.json` reference in this fix. Those are separate concerns. This fix is scoped to the five elements that produce a proper link-preview card and a branded browser tab: description, OG, Twitter Card, canonical, favicon.
