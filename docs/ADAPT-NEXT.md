# ADAPT: reusable components and product direction

Research date: 2026-10-17. This document distinguishes inspected upstream capabilities from integrations actually implemented in this repository. Repository popularity is not used as evidence of correctness. Licenses below describe the inspected code; model weights, optional dependencies and paid products need their own checks when adopted. Pin versions and retain required notices when adding a dependency or copying substantial code.

Implementation update: the first source-to-course workflow is now implemented at `/workspace`, including local TXT/Markdown/DOCX/PDF extraction, preference-guided AI generation, exact evidence validation, selected outlines, four presentation modes, bounded retry and persisted results. PDF.js 6.4.299 and Mammoth 1.13.0 are installed; the other candidates below remain recommendations. Visual mode currently uses accessible selectable steps rather than Mermaid/React Flow. See `superpowers/specs/2026-10-17-source-learning.md` for implemented scope and README for limits.

## Recommended direction

Keep the Next.js/React application and its existing deterministic lesson/retry behavior. Add a source-to-lesson pipeline in small stages. Adopt focused libraries at clear boundaries rather than replacing ADAPT with an entire research assistant.

The learning model should combine user preferences, prior knowledge, accessibility needs and demonstrated understanding. A preferred format is editable and contextual; it is not a permanent diagnosis of a visual/auditory/kinesthetic learner. Multiple representations must teach the same concepts and retain source evidence.

## Candidates inspected

### PDF.js: first PDF integration

- Source: https://github.com/mozilla/pdf.js
- Code license: Apache-2.0.
- Fit: JavaScript PDF parsing/rendering; display the original page next to a generated explanation and extract text with page provenance.
- Integration: lazy-loaded browser viewer/extractor using its worker. Keep page identifiers and text-item coordinates in a normalized source model. Send extracted text to the server only after the user requests generation.
- Limits: text extraction does not imply correct reading order for every multi-column PDF; scanned pages need OCR. Test worker packaging and representative Polish PDFs in WebKit before shipping.
- Decision: installed for the first PDF MVP; browser fixtures exercise worker-based text extraction. Original page-coordinate provenance, OCR and complex layout recovery remain future work.

### Mammoth: focused DOCX extraction

- Source: https://github.com/mwilliamson/mammoth.js
- Code license: BSD-2-Clause.
- Fit: semantic conversion of Word documents, including headings and paragraphs, rather than exact visual reproduction.
- Integration: use raw-text extraction or convert to an explicitly allowlisted structure. Preserve paragraph/heading identifiers for source references.
- Limits: upstream warns that converted HTML is not sanitized. Do not render uploaded HTML directly. DOCX is not the older binary DOC format; layout and page fidelity are separate problems.
- Decision: installed for DOCX raw-text extraction; generated HTML is not rendered. Browser fixtures include a valid DOCX and a malformed archive.

### Docling: advanced extraction service

- Source: https://github.com/docling-project/docling
- Code license: MIT; individual models have separate licenses.
- Fit: structured document conversion, PDF reading order, tables, OCR and a unified document representation; includes broad format support.
- Integration: a separate Python worker behind a narrow conversion API, returning source blocks, page references and confidence/warnings. Queue expensive work rather than importing the ML stack into a Next.js request handler.
- Limits: Python runtime, model downloads and compute requirements add deployment weight; benchmark on real documents and Apple Silicon/server hardware as appropriate. No claim that it was executed here.
- Decision: preferred upgrade if PDF.js/Mammoth fail the document fixture set. Avoid adding the service before it solves an observed extraction problem.

### Mermaid: generated explanatory diagrams

- Source: https://github.com/mermaid-js/mermaid
- Code license: MIT.
- Fit: flowcharts and sequence diagrams derived from constrained structured data.
- Integration: first generate a validated graph schema, then serialize supported graph types; lazy-load the renderer. Use strict security settings, disallow user-defined links/HTML and show an equivalent text outline.
- Limits: arbitrary model-generated Mermaid can contain syntax errors or unsafe content. Large graphs need simplification and mobile layout checks. Diagrams still need factual validation against source blocks.
- Decision: recommended initial diagram renderer for future generated lessons. Existing fixed interactive diagram remains in use today.

### React Flow: interactive concept maps

- Source: https://github.com/xyflow/xyflow
- Code license: MIT for the inspected repository; paid Pro examples/services are distinct.
- Fit: clickable concept graphs, prerequisite navigation and editable node connections.
- Integration: render a validated concept/edge model with keyboard controls and a text/list alternative. Selection should open a concept explanation rather than only pan a canvas.
- Limits: more interaction and layout work than Mermaid; touch gestures, zoom, keyboard use and VoiceOver need dedicated checks.
- Decision: use when the product needs graph interaction/editing. Do not install both graph libraries without distinct use cases.

### ts-fsrs: spaced repetition

- Source: https://github.com/open-spaced-repetition/ts-fsrs
- Code license: MIT.
- Fit: review scheduling based on previous review outcomes.
- Integration: give each source concept/card a stable identity and persist its review state. Feed explicit review outcomes to the scheduler. Show a due-review queue and retain course/version provenance.
- Limits: scheduling is not content generation, grading, or a replacement for the existing bounded Smart Retry. It requires durable review history and meaningful evaluation of retention.
- Decision: recommended after generated lessons and progress persistence are reliable.

### Open Notebook: reference or optional backend, not a drop-in library

- Source: https://github.com/lfnovo/open-notebook
- Code license: MIT; preserve upstream notices if reusing code.
- Fit: source-grounded notebooks, transformations, provider integration and audio workflows. Useful reference for separating ingestion, sources and generated artifacts.
- Inspected deployment: https://github.com/lfnovo/open-notebook/blob/main/docker-compose.yml exposes a separate REST API and uses SurrealDB; optional document extraction can bring a large ML stack.
- Integration option: deploy it separately and write a server-side adapter if its source management/podcast workflow is genuinely needed. Validate API contracts, user isolation and provider support before relying on it.
- Limits: its complete deployment is additional infrastructure. Research/chat workflows do not automatically supply adaptive teaching, sound assessments or deterministic progress rules.
- Decision: architecture reference first; compare its API against our exact needs before choosing a backend dependency. No source copied or service deployed here.

### WhisperSpeech: Polish audio candidate requiring a separate evaluation

- Source: https://github.com/WhisperSpeech/WhisperSpeech
- README describes Apache-2.0/MIT code and includes Polish examples; specific model licenses and dependencies still require inspection.
- Fit: potential self-hosted speech generation when browser voices are unavailable.
- Limits: a Polish sample is not proof of acceptable educational narration. Need tests of Polish pronunciation, numbers, abbreviations, latency, hardware requirements and weight licensing. It is not a browser-only drop-in.
- Decision: investigate alongside a hosted TTS option when audio becomes a supported product feature. Current browser speech still depends on an installed Polish voice.

## Suggested implementation sequence

### 1. Pasted text to one source-grounded lesson

Introduce a normalized source document with stable block IDs; concept objects containing evidence block IDs; and lesson representations containing concept IDs. Generate a bounded JSON schema through the existing server-only provider layer. Treat uploaded source text as untrusted content, not model instructions. Validate the response and show source excerpts for every concept.

Allow the user to correct the extracted topic list and select goals, level, available time and preferred starting format. Preserve the original material separately from generated output. Use explicit statuses for extracting, generating, failed and ready. Do not silently present invented fallback lessons for arbitrary sources.

Acceptance: several different Polish texts produce traceable, editable lessons; unsupported or insufficient material produces an honest error; refreshing preserves the source and session. Review factuality manually on a small reference corpus.

### 2. Document ingestion

Add Mammoth/PDF.js behind the same source adapter contract, with size/page limits and fixture tests. Evaluate Docling only if the initial extraction quality is inadequate. Explain when scanned PDFs need OCR. Do not claim support for arbitrary file formats.

### 3. Equivalent representations

Generate concise text, worked examples, structured diagrams and narration scripts from the same validated concept model. Use Mermaid initially. Offer a transcript and a list alternative to each diagram. Delay expensive audio generation until requested and cache artifacts by source/version/model/settings.

### 4. Adaptive learning loop

Track mastery per concept, not a single learner type. Separate preference from performance. After an error, diagnose whether vocabulary, prerequisite knowledge or application is missing and change scaffolding accordingly. Use new assessment contexts rather than repeating the same answer choices. Keep deterministic grading for closed questions; introduce rubric-based free responses only with separately evaluated uncertainty and review handling.

### 5. Durable progress and review

Use a storage abstraction: IndexedDB is a candidate for local files/progress; authenticated server persistence is a later explicit product choice. Add ts-fsrs only after stable concept IDs and review outcomes exist. Measure transfer to unfamiliar questions and delayed retention in addition to completion.

## Design implemented in this change

The current redesign is inspired by Apple Notes/Books and Apple Human Interface Guidelines, using original layout and existing Lucide icons. It is a web interface, not a native Apple component library.

- System font stack uses the device's installed UI font, including San Francisco on Apple devices; no Apple font files or SF Symbols assets are redistributed.
- Quiet neutral surfaces, blue action color, fine separators, segmented format selection, restrained translucent navigation and strong typographic hierarchy.
- Responsive home preview and existing lesson/assessment/practice/results screens, with safe-area handling, system light/dark appearance and reduced-motion/reduced-transparency support.
- Home preview actually switches among text, an interactive diagram and browser speech. Existing Polish course remains clearly identified as an example; no nonfunctional upload control or claim of generated user courses.
- All visible UI remains Polish. No upstream source has been copied and no candidate library was added just for appearance.

Design references:
- https://developer.apple.com/design/human-interface-guidelines/typography
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/accessibility

Apple-device behavior must be checked in WebKit as well as Chromium. Emulation is useful but does not replace real-device checks of Safari chrome, installed voices, touch, keyboard and VoiceOver.

## Verification environment

The Chromium suite includes desktop, Pixel 7, iPhone 13 and iPad Pro 11 viewport/device emulation. It exercises the existing learning journey as well as home format switching, dark appearance, compact layout, reduced motion and primary-action text contrast.

`npm run test:e2e:apple` selects a separate configuration for desktop Safari, iPhone and iPad in WebKit. WebKit downloaded successfully on this Linux host but could not launch because `libmanette-0.2-0` is missing. An attempted system dependency installation required interactive sudo authentication and did not complete. Therefore WebKit/Safari results must not be described as passing. Install the missing dependency on a suitable host and rerun that command after building.
