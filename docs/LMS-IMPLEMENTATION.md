# LMS implementation record

## Classroom roles and directory

Migration 004 is applied to the supplied hosted project. Registration now offers student or teacher as requested for the classroom demonstration; the database trigger stores that choice only on account creation. Teacher registrations open `/teacher`, students open `/assessment`. Existing profile roles remain unchanged. `/people` and the navigation display Nauczyciele for students or Studenci for teachers. The directory returns all opposite-role users without enrollment or assessment requirements, exposing only names, roles and IDs rather than private questionnaire answers. Verification: 72 SQL assertions, 15 Node test files, ESLint, TypeScript and all 24 LMS browser scenarios passed. The new signup/directory journey passes on desktop, Pixel, iPhone and iPad Chromium sizes.

## Hosted legacy cleanup (2026-10-25)

At the user's explicit request, the former visa-monitoring/Telegram application was removed from the supplied Supabase project after a new full protected backup and a successful rollback-only preflight. The exact manual cleanup is recorded in `scripts/sql/remove-legacy-visa-project.sql`; it uses explicit object names and RESTRICT, never schema-wide CASCADE. This script is not part of normal LMS installation.

Removed: 16 old public tables, seven old functions, the old role enum, three cron jobs, four old storage policies and the former auth user trigger. The LMS profile trigger remains. All nine LMS table row counts, both auth accounts and the active twenty-question assessment were unchanged. The project has only the main `postgres` database; service schemas, existing storage files/buckets and migration metadata are preserved. The backup and before/after manifest are excluded from Git in `.backups/`.

## Architecture

The approved Moodle-style platform extends the existing Next.js application. The root route is a public subject catalog; `/lesson` and `/workspace` retain the independent local demonstrations. Supabase Auth uses server-side cookie sessions. The separate `lms` schema owns accounts, enrollment, configurable initial assessment, immutable lesson revisions, attempts and progress. Netlify serves Next.js through its normal server runtime.

## Decisions

- For the classroom demonstration, a user chooses student or teacher at registration. The initial choice is persisted by the auth trigger; later metadata edits do not change the profile role. Teachers go directly to their panel, students to assessment. `/people` lists all users of the opposite role without requiring enrollment, returning only ID, display name and role.
- One teacher owns each subject; enrollment requires approval and a completed initial assessment.
- Initial preference and original questionnaire result remain separate. Lesson format selection changes only the preference.
- A lesson's formats can share one variant or use independent variants. Missing formats require explicit selection of an available one.
- The six question types share one test across formats; each question awards one point, without partial credit. The default pass threshold is 70 percent.
- Published revisions are immutable. Draft saves retain the public revision; a student's first access pins the revision for that lesson. This is per-lesson pinning, not a frozen snapshot of the entire curriculum.
- Teacher preview uses separate attempts and sequential progression; it never writes student progress.
- Private files are readable only if referenced by the student's accessible pinned revision, or current publication before first access. Course owners can access their uploads.
- Existing browser-local demonstration progress is not migrated into accounts.

## Source dependency

The EducationPlanner frontend module was inspected on 2026-10-25. It contains 20 questions, one point for the selected visual/auditory/tactile option, and preserves ties at the highest score. Tactile maps to the platform's kinesthetic preference. The user subsequently supplied HTML containing all 20 questions and options. The Polish translation is now bundled in `lib/lms/educationplanner.ts`; migration 003 activates the complete configuration. Attribution links to EducationPlanner. No missing questions were invented; repeated fragments were deduplicated by source question index.

Local browser tests temporarily install clearly marked TEST ONLY questionnaire fixtures, then restore the original configuration. These are not a replacement for EducationPlanner and must never be installed on a hosted project.

## Environment and release

The supplied Supabase project was connected through its TLS-verified Session pooler. A protected full database dump was created before the additive migration; the dump is excluded from Git. The public API was checked for catalog access and guest content denial. No service-role key or database password is required by the deployed application.

Hosted publication still requires the actual Netlify site URL in `NEXT_PUBLIC_SITE_URL`, matching Supabase Auth callback allowlists and verified outgoing email/SMTP when confirmation is enabled. Source changes are not a Netlify deployment. The complete questionnaire is already active in the supplied Supabase project.

Next.js and its ESLint configuration were patched from 16.4.0 to 16.4.1 after the build and registry audit reported critical vulnerabilities in the installed release. Other pre-existing dependency audit findings are outside this platform change.

## Guided material and classroom demonstration

The approved Moodle-inspired redesign adds a role-aware sidebar (collapsible on mobile), compact account header, course-card catalog with a guidance rail, numbered lesson sections, preview/student progress panels, teacher enrollment tools, and an in-lesson course index. Course settings are collapsible. Authentication uses a separate two-column desktop layout. Learning permissions and assessment logic are unchanged. Redesign verification: 18 Node test files, lint, typecheck and 44 browser scenarios passed, including mobile navigation and non-playing audio mocks.

Lessons now present one content block at a time. Students explicitly acknowledge text/media blocks and solve interactive single-choice or ordering practice before opening the quiz. This records progression, not proof of attention or a psychological diagnosis. The database enforces block order, practice correctness and completed study sessions independently of the UI. Switching format starts a fresh material session; retrying a quiz in the same completed session is allowed.

The new-lesson wizard generates one, two or three editors from selected formats and sharing assignments, without discarding existing authored variants. Incomplete practice may be saved as a draft but not published. Teacher preview uses separate study sessions and attempts.

The teacher dashboard can create the idempotent “Jak działa Internet? — kurs demonstracyjny” course. Its three lessons include visual structure, auditory scripts, kinesthetic exercises and all six quiz types. Narration in the LMS and `/lesson` example is now an explicitly marked, disabled DEMO player without speech synthesis or generation requests. Uploaded teacher audio and the separate legacy `/workspace` audio tools remain unchanged.

Migrations 005 and 006 were applied to the supplied hosted project after a fresh protected full backup. No teacher account existed at that point, so no account was invented and no course was assigned arbitrarily: register as Nauczyciel and use the dashboard button to create your demonstration course.

Latest guided-material verification: 18 Node test files, 118 SQL assertions and all 32 LMS browser scenarios passed across four viewports. ESLint and TypeScript passed. Hosted catalog returned HTTP 200; anonymous revision access returned HTTP 401. The browser run covers 3/2/1 editor grouping, draft restoration, ordering practice, format-switch material reset and the student progression journey.

## Verification commands

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm exec supabase test db
pnpm test:e2e:lms
```

The LMS browser script builds against the isolated local Supabase and refuses hosted fixture targets. `pnpm test:e2e:lms --all` runs the complete browser suite. A normal deployment must build with its own public Supabase variables after local tests; do not publish the locally configured test build.

Final verification: ESLint, TypeScript and 13 Node test files passed. All 54 SQL assertions passed. Browser regression: 96 scenarios passed across desktop, Pixel, iPhone and iPad Chromium configurations, including the full student journey and all six constructor types. The complete browser run also found horizontal overflow in the compact `/workspace` demonstration at 320 px; the four viewport repetitions of that one scenario were excluded from the successful 96-scenario run. Its assertion is unchanged.

All three hosted migrations were applied, including strict question-option validation and the complete questionnaire. Hosted public catalog read returned HTTP 200 and guest revision read was denied with SQL permission code 42501. The pre-migration dump is stored in `.backups/pre-lms-2026-10-25.dump`, mode 0600 and excluded from Git. Previous questionnaire configuration is backed up separately before activation. No Netlify deployment or real hosted SMTP/email delivery is claimed.

Questionnaire release verification: 15 Node test files passed, SQL 64/64 assertions passed, and all 20 LMS/catalog/questionnaire browser scenarios passed across four viewports. The new questionnaire journey checks twenty questions, partial save and reload, ten-to-ten tie resolution, persistent final result and enrollment availability. Database scoring keys are compared against the bundled translation to prevent drift.
