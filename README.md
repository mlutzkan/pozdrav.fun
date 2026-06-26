# pozdrav.fun

Personalized Bulgarian song gift service. Customers fill out an order form, pay via Stripe, and receive a custom MP3 by email within 24–72 hours.

## Architecture

Fully static frontend (no build step) deployed on **Cloudflare Pages**. Server-side logic runs as **Cloudflare Pages Functions** — lightweight edge functions that live in `functions/api/`.

```
Browser → Cloudflare Pages (static files)
                ↓ fetch()
          Cloudflare Pages Functions
                ↓ fetch()          ↓ fetch()
           Stripe REST API      Resend HTTP API
```

No Node.js runtime, no npm packages at runtime. Everything uses the standard `fetch()` API available in the Cloudflare Workers environment.

---

## File structure

```
├── index.html              # Entire site — one HTML file
├── style.css               # Global styles
├── order-form.css          # Order modal styles
├── app.js                  # Hero card + audio example player
├── order-form.js           # 7-step order form, Stripe payment flow
├── tracks.json             # Audio manifest (which MP3 goes where)
├── audio/                  # MP3 files served as static assets
├── og.png                  # Open Graph image (1200×630)
├── og-linkedin.png         # LinkedIn cover (1584×396) with QR code
├── sitemap.xml
├── robots.txt
└── functions/
    └── api/
        ├── create-payment-intent.js   # Creates Stripe PaymentIntent
        ├── validate-promo.js          # Validates promo codes server-side
        └── send-confirmation.js       # Sends confirmation emails via Resend
```

---

## How the order flow works

1. **Steps 1–6** — user fills in recipient, story, emotions, style, extras, email
2. **Step 7 (payment)** — on entering this step:
   - User can optionally enter a promo code; the frontend calls `/api/validate-promo` (debounced 500ms) to validate it without exposing codes in browser source
   - `order-form.js` calls `/api/create-payment-intent` with the tier and promo code
   - The backend applies the discount, creates a Stripe PaymentIntent, and returns the `clientSecret`
   - Stripe Elements mounts the payment form
3. **On pay** — `stripe.confirmPayment()` is called; if 3D Secure is needed, Stripe redirects and returns to `?payment=success`
4. **On success** — `/api/send-confirmation` is called with the full order payload; it sends an admin notification (plain text) and a customer confirmation (HTML) via Resend

---

## Audio player (`app.js`)

Audio tracks are declared in `tracks.json`. Each entry has a `slot` (`hero` or `example`) and optionally a `file` path. If `file` is `null` or `comingSoon: true`, the card shows a disabled state.

- The hero card plays `audio/BDZ.mp3` and has a seekable progress bar
- Example cards (up to 4) are wired from `tracks.json` at page load
- Only one audio source can play at a time — starting any track stops the currently playing one (checked via `audio.paused` directly, not a boolean flag, to avoid drift)
- Durations are auto-detected via the `loadedmetadata` event; falls back to the value in `tracks.json`

To add a new example song: add the MP3 to `audio/`, update `tracks.json` with the file path and set `comingSoon: false`.

---

## Payments (Stripe)

Stripe is called via raw `fetch()` to `https://api.stripe.com/v1/payment_intents` — no Stripe Node SDK (incompatible with the Cloudflare Workers runtime).

Prices are hardcoded server-side in `create-payment-intent.js`:

| Tier      | Price  |
|-----------|--------|
| Basic     | €39    |
| Premium   | €59    |
| Signature | €99    |

Stripe's minimum charge is €0.50 — keep this in mind when setting fixed-price promo codes.

---

## Promo codes

Codes are stored as a JSON string in the `PROMO_CODES` Cloudflare secret — never in source code. Two types are supported:

```json
{
  "CODE1": { "type": "fixed",   "amountCents": 50 },
  "CODE2": { "type": "percent", "discount": 0.5 }
}
```

- `fixed` — charges exactly `amountCents` regardless of tier (minimum 50 for Stripe EUR)
- `percent` — multiplies the tier price by `(1 - discount)`

The frontend validates codes via `/api/validate-promo` (server-side, so codes are never exposed in the browser). The actual discount is enforced again inside `/api/create-payment-intent` — the frontend price display is informational only.

---

## Email (`send-confirmation.js`)

Uses the **Resend HTTP API** (`https://api.resend.com/emails`). No SMTP, no nodemailer.

Two emails are sent per order:
- **Admin** — plain text summary of all order fields, sent to the configured admin address
- **Customer** — HTML confirmation with order number and delivery estimate

Optional `EMAIL_SIGNATURE_HTML` env var appends a signature block to the customer email.

---

## Environment variables

Set these as secrets in Cloudflare Pages → Settings → Environment variables:

| Variable              | Description                                      |
|-----------------------|--------------------------------------------------|
| `STRIPE_SECRET_KEY`   | `sk_live_...` (use `sk_test_...` for testing)   |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (returned to the browser)       |
| `RESEND_API_KEY`      | From resend.com — send-only access is enough     |
| `PROMO_CODES`         | JSON string (see Promo codes section above)      |
| `EMAIL_SIGNATURE_HTML` | Optional HTML appended to customer emails       |

After adding or changing secrets, trigger a redeploy: Deployments tab → latest deployment → **⋯ → Retry deployment**.

---

## Local development

```bash
# Just open the file — no server needed for the static UI
open index.html

# To test the Cloudflare Functions locally, use Wrangler:
npx wrangler pages dev . --compatibility-date=2024-01-01
```

When running locally via `file://`, `tracks.json` fetch will fail — `app.js` falls back to a hardcoded array that mirrors `tracks.json`.

---

## Deployment

The site deploys automatically on every push to `master` via the Cloudflare Pages GitHub integration. No build command — the output directory is the repo root (`/`).

The `netlify/` directory contains legacy Netlify Functions from before the migration and is no longer used.
