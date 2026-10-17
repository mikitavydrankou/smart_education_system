# Source-grounded adaptive learning

Build the first complete user-material workflow alongside the existing DNS example. Polish UI and the current Apple-inspired responsive theme remain required. No accounts, cloud database or permanent learning-style labels.

Users paste text or import TXT/Markdown/DOCX/text-based PDF. Normalize input into stable paragraph blocks (120–20,000 characters overall, 10 MB upload, at most 40 PDF pages). Show unsupported/scanned/oversized input errors honestly. Files are extracted locally; generation sends the extracted text and explicit learning preferences to the configured server-side model.

Preferences: goal (understand/exam/apply), level (beginner/intermediate), time (5/15/30 minutes) and starting format (text/visual/audio/practice). Generate 3–5 concepts with equivalent representations, exact source evidence and one question plus a distinct bounded retry per concept. Validate IDs, source quotations, option bounds and graph references before accepting model output. This validation is not a factuality guarantee; source inspection remains visible.

Flow: import/preferences → AI generation → inspect/select outline → study each selected concept in editable formats → deterministic question feedback → at most one distinct retry with extra scaffolding → final concept summary. Persist the source, settings, accepted course and replayable progress locally. Refresh must restore selected answers, retry feedback and results. Storage errors must not prevent in-memory learning. Replacing the course requires confirmation. Provider failure must preserve the draft and allow retry, never fabricate a substitute course.

Generated text is rendered as text. Keys remain server-only. Source text is untrusted data, not system instructions. Restrict body sizes, same-origin requests, concurrent generation and bounded per-process request frequency. Abort/time out remote work and block duplicate UI submissions.

The initial visual representation uses validated concept steps/relations with an accessible list alternative. Browser audio has a transcript and explicit missing-voice handling. PDF.js and Mammoth are adopted for document parsing with upstream licenses retained by package distribution. Scanned PDF OCR, self-hosted TTS, cross-device accounts and spaced repetition remain subsequent independent features.

Acceptance: unit checks for malformed course/evidence/profile/storage and retry invariants; browser checks for pasted/imported text, outline selection, all formats, successful and unsuccessful retry, refresh, results/restart and unavailable generation. Existing demo tests continue passing. Perform at least one real source-to-course request with OpenRouter when available, without logging credentials.
