# Bible Trivia

A Scripture-learning app with an editorial admin tool ("the Studio") behind it. Not a trivia game — the goal is engagement with Scripture, not scoring. See "Content Philosophy" below.

**Live app:** https://dlc598.github.io/bible-trivia-beta/
**Studio (admin):** https://dlc598.github.io/bible-trivia-beta/admin.html

## Architecture

Static site — plain HTML/CSS/vanilla JS, no build step, no framework. Hosted on GitHub Pages, deployed automatically on every push to `main`.

- `index.html` / `app.js` / `style.css` / `learning.css` — the public app
- `admin.html` + `admin-core.js`, `admin-questions.js`, `admin-feedback.js`, `admin-import.js`, `admin-submissions.js` — the Studio
- `data/questions.json` — a point-in-time export/backup artifact only. **Not live data** — Supabase is the source of truth for everything.

Backend is Supabase (project ref `crmywofbrznzgxibdevr`), accessed via the Supabase JS client (Studio) and three public Edge Functions (public app).

## Local development

There's no build step — just open `index.html` or `admin.html` directly, or serve the folder with any static file server. Changes to JS/CSS take effect on refresh. The Studio needs a live Supabase magic-link sign-in to do anything past the login screen (no local/offline auth).

## Deployment

Push to `main` → GitHub Pages redeploys automatically, usually within 1–2 minutes. There is no staging environment or CI pipeline currently.

## Supabase

**Authentication:** the Studio uses Supabase Auth passwordless email sign-in (magic link). The public app has no user accounts — anonymous visitors are tracked only by a browser-local UUID (`bibleTriviaAnonymousSessionId` in localStorage), used to prevent duplicate feedback/learning-response submissions.

**Admin authorization:** authentication (having a valid session) is separate from authorization (being allowed to see/edit data). A `is_feedback_admin()` database function checks the signed-in user's email against the `admin_allowlist` table. Row Level Security policies on every admin-facing table call this function — so authorization is enforced at the database layer, not just hidden in the UI. Signing in without being on the allowlist gets you a session but no usable data access.

**To add a new admin:** insert a row into `admin_allowlist` with their email. There's currently no UI for this — it's a direct database operation.

### Tables

| Table | Purpose |
|---|---|
| `questions` | The question bank. `status` (Draft/Published/Retired) controls what the public app can see; `reviewed`/`needs_more_work` track editorial review independently of publish status. |
| `question_submissions` | Public-submitted question ideas. Never auto-published — always Pending → editor review → Approved (creates a Draft in `questions`) or Rejected. |
| `feedback_events` | Player-submitted quality feedback (thumbs up/down + issue tags + comment). `processing_status` tracks the editorial workflow (New → Under Review → Revision Planned → Resolved/Dismissed). |
| `feedback_status_history` | Audit log of `feedback_events.processing_status` changes, written automatically by a database trigger. Includes who changed it (`changed_by_email`). |
| `learning_response_events` | "I Knew This" / "Still Learning" self-reports from players. |
| `admin_allowlist` | Emails authorized to use the Studio. |
| `feedback_question_summary` | A database view aggregating feedback counts per question (positive/negative counts, tagged count, latest activity, comment count) — not yet surfaced in the Studio UI as of this writing. |
| `question_editorial_backup_20260722` | Frozen backup taken before a bulk wording cleanup. Historical reference only. |

### Question ID format

Questions use stable, human-readable IDs like `BTQ-0001`. **IDs are immutable once created** — the Studio's editor locks the ID field when editing an existing question, because `feedback_events` and `learning_response_events` reference questions by this ID, and a changed ID would orphan that history.

### Edge Functions

Three public, unauthenticated Edge Functions mediate all anonymous writes (`submit-feedback`, `submit-learning-response`, `submit-question`) so anonymous users never get direct table-insert access — every public write passes through validation first.

## Editorial workflow

A question's **publish status** (Draft/Published/Retired) and **review status** (reviewed / needs more work) are independent. A question can be Published but not yet reviewed; a previously-reviewed question can later be flagged Needs More Work. The Review Queue in the Studio surfaces flagged questions first, then unreviewed ones.

Public submissions always go through human review before becoming live — see `question_submissions` above. This is a deliberate design choice, not a missing feature: automatic publication of public content was considered and rejected.

## Content philosophy

- Scripture before trivia — questions should draw the learner into Scripture, not just test recall of obscure facts.
- Clarity over cleverness — direct, naturally-worded questions over clever ones.
- Human editorial judgment is a feature. Every review-state, Draft/Published/Retired, and no-auto-publish choice in the schema protects this.
- Target audience: churches, Bible classes, individual Christians, families, serious Bible students — not a mass-market entertainment app.

## Testing checklist

There's no automated test suite. Before trusting a change, manually verify in a real browser:

- [ ] Studio magic-link sign-in and admin authorization
- [ ] Question Bank: search, filter, add, edit, publish/retire
- [ ] Review Queue: flagged-first ordering, marking reviewed/needs-more-work
- [ ] Feedback tab: filters, status changes, Edit Question button
- [ ] Submissions: review, edit, approve into Draft, reject
- [ ] Import: XLSX/CSV/JSON validation and duplicate detection
- [ ] Export: Published JSON download
- [ ] Public app: category selection, question flow, feedback submission, question submission, learning response
- [ ] Confirm the public app only ever receives `status = Published` questions

## Backup and recovery

`data/questions.json` in the repo is a point-in-time snapshot, useful for disaster recovery but not kept automatically in sync — regenerate it via the Studio's Export feature before relying on it. `question_editorial_backup_20260722` preserves pre-cleanup question wording directly in the database.