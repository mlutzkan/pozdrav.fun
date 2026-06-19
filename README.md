# pozdrav.fun

Landing page for **pozdrav.fun** — personalized Bulgarian songs created as gifts.

## Structure

```
.
├── index.html        # The entire site (HTML/CSS/JS, no build step)
├── audio-za-teb.mp3  # Sample audio for the hero "За теб – с любов" card
└── README.md
```

## Local preview

Just open `index.html` in any browser — no server or build step required.

## Deploying

### Option A — GitHub Pages (free, simplest)
1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under "Source", select the `main` branch and `/ (root)` folder.
4. GitHub gives you a URL like `https://yourusername.github.io/pozdrav-fun/`.
5. To use your own domain (`pozdrav.fun`):
   - In **Settings → Pages → Custom domain**, enter `pozdrav.fun`.
   - At your domain registrar, add a `CNAME` record pointing to `yourusername.github.io`.

### Option B — Netlify / Vercel
1. Connect your GitHub repo in Netlify or Vercel.
2. Deploy — no build command needed (it's static HTML).
3. Add your custom domain in the project settings.

## Notes

- No dependencies, no package.json, no build tools — just static files.
- Fonts are loaded from Google Fonts via CDN (requires internet connection to render correctly).
