# Gym Video Generator

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Enter your Runway API key in `.env`.
4. Run `npm run dev`.
5. Enter the gym name for this video.
6. Upload up to four gym images and a logo, or paste public HTTPS image links. An optional reference video can also be uploaded.
7. Paste your script and scene directions (up to 14,000 characters).
8. Choose a model and settings, including aspect ratio and audio.
9. Select **Generate video**.

All inputs are dynamic and kept only in the current browser session. Uploaded files are sent through server memory; image links are passed directly to Runway, not fetched by this server. Links must point directly to publicly accessible images, not sharing pages. Images support JPG, PNG, and WebP up to 16 MB; the optional reference video supports MP4, MOV, and WebM up to 64 MB.

The gym name, script, and ordered reference labels are combined into the generation prompt. Logos are generative references, not guaranteed pixel-perfect overlays. Spoken lines require an audio-capable model with audio enabled; exact narration and text rendering are not guaranteed. Text-only models cannot accept image, logo, or video references. Existing model configuration and provider integration are unchanged.

Run `npm test` for validation and mocked generation-route tests, and `npm run build` to check and build both client and server. Tests do not call Runway or spend credits.
