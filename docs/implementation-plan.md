# ADAPT completion plan

Implement the supplied ADAPT specification directly in the existing Next.js UI.

1. Replace mixed-language educational data with typed Polish explanations and distinct original/retry questions. Validate question-bank invariants.
2. Test and implement a deterministic session reducer. Persist assessment answers, concept visits, selection, practice attempt and feedback. Validate restored data by replaying valid events; aggregate concept results conservatively.
3. Reuse the existing visual shell and cards; connect all lesson stages through the session. Extract multimedia and mistake explanations into focused components. Provide Polish speech, accessible controls and restart.
4. Add a validated server-only Responses API service with bounded output, timeout, deduplication and verified fallback. Send only question identifiers/answer/style from the browser and resolve trusted content on the server.
5. Run deterministic tests, type checking, lint, production build and browser journeys if browser tooling can be installed. Document exact commands and honest limitations.

Review focus: malformed storage, refresh during retry feedback, multiple questions for one concept, direct route access, missing voices/API key.
