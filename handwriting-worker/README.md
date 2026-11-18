# Handwriting to Text — Backend Setup

This project has a static GitHub Pages frontend and a separate Cloudflare Worker API.
The API key must remain a Cloudflare Worker Secret. Never paste it into `index.html`, GitHub, or a chat.

## 1. Create a Gemini API key

1. Open https://aistudio.google.com/app/apikey
2. Sign in and create an API key for Gemini.
3. Keep the key private. Do not send it in this chat or commit it to GitHub.

**Privacy note:** Gemini's Free Tier may use submitted content to improve Google products. For private or sensitive notes, check the current Google API terms and use an eligible paid tier if its data-use terms meet your needs. The Worker sets `store: false` so the interaction itself is not intentionally stored as conversation history, but this does not override provider data-use terms.

## 2. Create the Cloudflare Worker

1. Open https://dash.cloudflare.com/ and sign in (create a free account if needed).
2. Go to **Workers & Pages** → **Create** → **Worker** → **Deploy**.
3. Open the new Worker and choose **Edit code**.
4. Replace the starter code with the contents of `index.js` in this folder and deploy.
5. Create a Cloudflare Turnstile widget at https://dash.cloudflare.com/?to=/:account/turnstile and add the hostname `tawhidpdftools.github.io`. Copy both its Site Key and Secret Key.
6. Open **Settings** → **Variables and Secrets** → **Add**.
7. Add two **Secret** values: `GEMINI_API_KEY` (from Google AI Studio) and `TURNSTILE_SECRET` (Turnstile Secret Key). Save/deploy.
8. In the website's `index.html`, set `HANDWRITING_API_URL` to the Worker URL and `TURNSTILE_SITE_KEY` to the Turnstile Site Key, then commit the change.

The Worker accepts only requests from https://tawhidpdftools.github.io and exposes:
- `GET /health`
- `POST /api/recognize`

## 3. Connect the frontend

After deployment, Cloudflare shows a URL similar to:
`https://your-worker-name.your-account.workers.dev`

The website's Handwriting to Text tool will call:
`https://your-worker-name.your-account.workers.dev/api/recognize`

The live frontend integration is deliberately left unactivated until the Worker URL, Turnstile Site Key, and server secrets are configured. The Site Key is public and may appear in the frontend; the Gemini API key and Turnstile Secret Key must remain Worker Secrets. Do not add either secret to the frontend.

## Current request format

```json
{
  "mimeType": "image/jpeg",
  "data": "BASE64_WITHOUT_DATA_URL_PREFIX",
  "language": "auto"
}
```

Supported MIME types: JPEG, PNG, WebP, PDF. Maximum file size: 10 MB.

## Important deployment/security note

The Worker requires a valid Turnstile token and verifies it server-side, restricts the request origin/hostname, and caps the upload size. Turnstile tokens expire after five minutes and are single-use. Also configure appropriate Gemini usage limits/billing alerts. Never commit API secrets to GitHub. Do not process confidential documents until the provider data-use terms have been reviewed.
