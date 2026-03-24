# Deployment Guide — Astral Chart

## Stack Summary
- **Type**: Static frontend (client-side only, no backend)
- **Framework**: React 18 + TypeScript + Vite + Tailwind CSS
- **Build output**: `dist/` directory
- **Build command**: `npm run build` (runs `tsc -b && vite build`)

## Deployment Platform: Vercel

**Why Vercel**: Zero-config Vite detection, free tier (100GB bandwidth/month), instant global CDN, automatic HTTPS, preview deployments on branches, and the fastest path from code to live URL for static frontends.

**Alternatives considered**:
- Netlify — equally good, slightly more manual config for Vite
- Cloudflare Pages — excellent performance, but more setup steps
- GitHub Pages — free but no preview deployments, manual CI/CD setup

---

## Prerequisites

1. **Node.js** ≥ 18 (already installed — used for development)
2. **npm** (comes with Node.js)
3. **Vercel account**: Sign up at https://vercel.com (free tier is sufficient)
4. **Vercel CLI**: Install globally:
   ```bash
   npm i -g vercel
   ```
5. **Git**: Project should be committed to a git repository

---

## Build

```bash
# From the project root
npm run build
```

This produces the `dist/` directory with:
- `index.html` — entry point
- `assets/` — bundled JS, CSS, and city data

**Expected output**: ~7.2 MB total (mostly the cities database). Build should complete in under 5 seconds.

---

## Deploy Steps

### Option A: CLI Deployment (Fastest)

```bash
# 1. Install Vercel CLI (if not already installed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to preview (first time sets up the project)
vercel

# 4. Deploy to production
vercel --prod
```

On first run, Vercel will ask:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (creates new)
- **Project name?** → `astral-chart` (or your preference)
- **Directory with code?** → `./` (current directory)
- **Override settings?** → No (Vercel auto-detects Vite)

### Option B: Git Integration (Recommended for ongoing development)

1. Push your repo to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com/new
3. Import your repository
4. Vercel auto-detects the Vite framework
5. Click **Deploy**

Every future `git push` to `main` will trigger an automatic production deployment. Pull request branches get preview URLs.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_OPENAI_API_KEY` | No | OpenAI API key for GPT-powered interpretations and Discuss feature. If not set, GPT features show a prompt to enter the key in-app. |

To set environment variables on Vercel:
1. Go to your project → Settings → Environment Variables
2. Add the variable name and value
3. Select which environments it applies to (Production, Preview, Development)

> **Security note**: The OpenAI API key is exposed to the client since this is a static app. For production use, consider a serverless function proxy (Vercel Edge Functions) to keep the key server-side.

---

## Domain & DNS (Optional)

### Custom Domain
1. Go to your Vercel project → Settings → Domains
2. Add your domain (e.g., `astralchart.com`)
3. Update your DNS records as directed:
   - **A record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com` (for subdomains)
4. HTTPS is provisioned automatically via Let's Encrypt

### Vercel Default Domain
Your app will be live at `https://astral-chart.vercel.app` (or similar) by default — no custom domain needed.

---

## Post-Deploy Verification

After deploying, verify the following:

1. **Load the app** — Visit the production URL. The landing page should render with the mystic dark theme.
2. **Birth data form** — Complete the multi-step form:
   - Enter a date of birth
   - Enter a time of birth
   - Search and select a city (autocomplete should work)
   - Select focus areas
3. **Chart calculation** — Submit the form. The natal chart wheel should render correctly.
4. **Reading display** — Scroll through the interpretation sections (summary, planets, houses, aspects).
5. **Interactive tooltips** — Hover over planets, aspect lines, and houses on the chart.
6. **Transit readings** — Navigate to transit readings and verify daily/weekly/monthly calculations.
7. **Synastry** — Test the couple synastry flow with a second person's data.
8. **Timeline** — Check the transit timeline tab renders events correctly.
9. **GPT features** — If API key is set, test Discuss and transit interpretations.
10. **Mobile** — Test on a mobile device or responsive view (375px width).

---

## Rollback

### CLI Rollback
```bash
# List recent deployments
vercel ls

# Promote a previous deployment to production
vercel promote <deployment-url>
```

### Dashboard Rollback
1. Go to your Vercel project → Deployments
2. Find the previous working deployment
3. Click the three-dot menu → **Promote to Production**

### Git Rollback
```bash
# Revert to a previous commit
git revert HEAD
git push origin main
# Vercel auto-deploys the revert
```
