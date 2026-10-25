# Moodle-inspired layout implementation plan

**Goal:** Replace the landing-page layout with a compact Polish learning portal, following the user's approved light panels, blue actions and sidebar direction.

**Architecture:** Keep Next.js, Supabase and all learning permissions unchanged. Use a shared role-aware shell with a responsive navigation drawer. Restructure the public catalog and course overview; scope visual changes to LMS classes so legacy examples remain unchanged.

**Tasks**
- [x] Add browser assertions for portal heading, desktop sidebar, mobile drawer and no horizontal overflow.
- [x] Build active navigation, account header and responsive workspace shell.
- [x] Restructure catalog into course cards and a helpful right rail; add course progress and numbered lesson rows.
- [x] Apply compact, accessible Moodle-inspired styling to LMS forms, lesson player and teacher tools.
- [x] Run unit tests, lint, typecheck and browser scenarios: 18 Node files and 44 browser cases passed; desktop/mobile catalog and registration screenshots inspected.
- [x] Final production build with the hosted project environment.
