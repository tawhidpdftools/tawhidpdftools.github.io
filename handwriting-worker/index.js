/**
 * Tawhid's PDF Tools — Handwriting Recognition API
 * Deploy this file as a Cloudflare Worker.
 * Add a Worker Secret named GEMINI_API_KEY before use.
 */
const ALLOWED_ORIGINS = new Set(["https://tawhidpdftools.github.io"]);
const MODEL = "gemini-3.8-flash";
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "This website is not allowed to use this API." }, 403);
    }
    const cors = corsHeaders(origin);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "handwriting-recognition", model: MODEL }, 200, cors);
    }
    if (request.method !== "POST" || url.pathname !== "/api/recognize") {
      return json({ error: "Not found." }, 404, cors);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "The server API key has not been configured yet." }, 503, cors);
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return json({ error: "The upload is too large. Please use a file smaller than 10 MB." }, 413, cors);
    }

    try {
      const body = await request.json();
      const mimeType = String(body.mimeType || "").toLowerCase();
      const data = String(body.data || "");
      const language = String(body.language || "auto").slice(0, 24);

      if (!ALLOWED_TYPES.has(mimeType)) {
        return json({ error: "Please upload a JPG, PNG, WebP image or PDF." }, 415, cors);
      }
      if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
        return json({ error: "The uploaded file data is invalid." }, 400, cors);
      }
      const estimatedBytes = Math.floor(data.length * 3 / 4);
      if (estimatedBytes > MAX_FILE_BYTES) {
        return json({ error: "The file must be 10 MB or smaller." }, 413, cors);
      }

      const languageInstruction = {
        auto: "Detect the language or languages automatically. The page may contain Bengali, English, Arabic, or a mixture.",
        bn: "The primary handwriting language is Bengali. Preserve any English or Arabic parts as written.",
        en: "The primary handwriting language is English. Preserve any Bengali or Arabic parts as written.",
        ar: "The primary handwriting language is Arabic. Preserve any Bengali or English parts as written.",
        mixed: "The page contains mixed Bengali, English, and Arabic. Preserve each script exactly as written."
      }[language] || "Detect the language or languages automatically.";

      const prompt = [
        "Task: transcribe the handwritten content in the attached image or PDF into editable plain text.",
        "Accuracy is more important than rewriting. Read carefully and inspect every line.",
        languageInstruction,
        "Strict rules:",
        "1. Transcribe only what is actually visible. Do not add, remove, translate, summarize, explain, paraphrase, spell-correct, or modernize anything.",
        "2. Preserve the original language, words, spelling, numerals, punctuation, headings, numbering, bullets, paragraph breaks, and line order as closely as possible.",
        "3. Preserve Arabic script and its right-to-left writing; do not transliterate Arabic.",
        "4. Keep Bengali and English words in their original scripts. Do not translate between languages.",
        "5. If a word or short section truly cannot be read, write [অস্পষ্ট] at that location rather than guessing.",
        "6. Do not describe the image and do not add a preface or conclusion. Return only the transcription.",
        "7. For PDFs, transcribe every page in order and put a clear page separator such as ===== পৃষ্ঠা ২ ===== between pages.",
        "Output should be clean, editable text while retaining the visible structure."
      ].join("\n");

      const inputPart = mimeType === "application/pdf"
        ? { type: "document", data, mime_type: mimeType }
        : { type: "image", data, mime_type: mimeType };

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
          "Api-Revision": "2026-05-20"
        },
        body: JSON.stringify({
          model: MODEL,
          store: false,
          input: [
            { type: "user_input", content: [inputPart, { type: "text", text: prompt }] }
          ]
        })
      });

      const result = await response.json();
      if (!response.ok) {
        const detail = result?.error?.message || "The handwriting model could not process this file.";
        return json({ error: detail }, response.status >= 500 ? 502 : response.status, cors);
      }

      const text = (result.steps || [])
        .filter(step => step.type === "model_output")
        .flatMap(step => step.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text || "")
        .join("\n")
        .trim();

      if (!text) {
        return json({ error: "The model returned no text. Please try a clearer image or PDF." }, 502, cors);
      }

      return json({ text, model: MODEL }, 200, cors);
    } catch (error) {
      return json({ error: error?.message || "Unexpected server error." }, 500, cors);
    }
  }
};
