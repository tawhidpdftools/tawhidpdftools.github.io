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
5. Open **Settings** → **Variables and Secrets** → **Add**.
6. Choose **Secret**, set the variable name to `GEMINI_API_KEY`, paste the Gemini API key as its value, and save/deploy.

The Worker accepts only requests from https://tawhidpdftools.github.io and exposes:
- `GET /health`
- `POST /api/recognize`

## 3. Connect the frontend

After deployment, Cloudflare shows a URL similar to:
`https://your-worker-name.your-account.workers.dev`

The website's Handwriting to Text tool will call:
`https://your-worker-name.your-account.workers.dev/api/recognize`

The live frontend integration is deliberately left unactivated until the Worker URL and secret are configured. Do not add the Gemini key to the frontend.

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

CORS origin filtering is a basic guard, not full authentication; browser CORS does not stop direct scripted requests. Before offering this publicly, add Cloudflare Turnstile and/or rate limiting and set usage/billing alerts on the Gemini project. Do not process confidential documents until the provider data-use terms have been reviewed.
