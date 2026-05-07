# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- In progress

## Current Goal

- Feature spec `07-wire-editor-home` implemented and verified with a production build.

## Completed

- Feature spec `01-design-system` implemented:
  - `shadcn/ui` initialized and configured.
  - Required primitives added: `Button`, `Card`, `Dialog`, `Input`, `Tabs`, `Textarea`, `ScrollArea`.
  - `lucide-react` installed.
  - Shared `cn()` helper available in `lib/utils.ts`.
  - Global dark theme tokens wired for component usage.
- Feature spec `02-editor` implemented:
  - Added `components/editor/editor-navbar.tsx` with fixed-height top bar, left/center/right sections, and sidebar toggle icon state.
  - Added `components/editor/project-sidebar.tsx` as a floating, non-pushing, slide-in left sidebar with tabs and placeholders.
  - Added full-width `New Project` action button with `Plus` icon at the sidebar bottom.
  - Added `components/editor/editor-dialog-pattern.tsx` to establish dialog structure (title, description, footer actions) using existing color tokens.
  - Wired the editor chrome into `app/page.tsx` to validate sidebar interactions.
- Feature spec `03-auth` implemented:
  - Wrapped `app/layout.tsx` with `ClerkProvider` using `@clerk/ui/themes` dark base theme and CSS-variable-backed appearance overrides.
  - Added public auth routes at `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` with minimal two-panel desktop layout and form-only mobile behavior.
  - Added root `proxy.ts` (Next.js 16 convention) with protected-by-default routing and public route matching for sign-in/sign-up URLs.
  - Updated `app/page.tsx` to redirect authenticated users to `/editor` and unauthenticated users to `/sign-in` (or configured Clerk sign-in URL).
  - Moved editor chrome to `app/editor/page.tsx` and added Clerk `UserButton` to `components/editor/editor-navbar.tsx`.
- Feature spec `04-project-dialogs` implemented:
  - Added editor home screen with heading, description, and `New Project` button in the center of `/editor`.
  - Created `hooks/use-project-dialogs.ts` hook managing dialog state, form state, loading state, and mock project data.
  - Added `components/editor/create-project-dialog.tsx` with name input and live slug preview.
  - Added `components/editor/rename-project-dialog.tsx` with prefilled input, auto-focus, and Enter-to-submit.
  - Added `components/editor/delete-project-dialog.tsx` with destructive confirmation styling.
  - Updated `components/editor/project-sidebar.tsx` with project item list, rename/delete actions for owned projects, hidden actions for shared projects, and mobile backdrop scrim.
  - Wired all dialogs: editor home `New Project` → Create, sidebar `New Project` → Create, sidebar rename → Rename, sidebar delete → Delete.
- Feature spec `05-prisma` implemented:
  - Added `prisma/models/project.prisma` with `ProjectStatus`, `Project`, and `ProjectCollaborator` models, relations, and required indexes/constraints.
  - Added `lib/prisma.ts` singleton Prisma client with URL-based branching: Accelerate path for `prisma+postgres://`, `@prisma/adapter-pg` path otherwise.
  - Updated `prisma/schema.prisma` generator to `prisma-client-js` to generate and consume `@prisma/client`.
  - Created and applied initial migration for project/collaborator data model.
- Feature spec `06-project-apis` implemented:
  - Added `app/api/projects/route.ts` with authenticated `GET` and `POST` handlers for owner-scoped project listing and creation.
  - `POST /api/projects` defaults missing or empty `name` to `Untitled Project`.
  - Added `app/api/projects/[projectId]/route.ts` with authenticated `PATCH` and `DELETE` handlers.
  - Enforced owner-only mutations for rename/delete with explicit `401` (unauthenticated) and `403` (non-owner) responses.
- Feature spec `07-wire-editor-home` implemented:
  - Converted `app/editor/page.tsx` into a server component and moved interactive UI wiring into `components/editor/editor-home-client.tsx`.
  - Added `lib/project-data.ts` helper to fetch owned and shared projects server-side for the editor sidebar.
  - Added `hooks/use-project-actions.ts` to manage create/rename/delete dialogs and API mutations against `/api/projects`.
  - Wired create flow to generate `roomId` preview, create projects with aligned `project.id` and room ID, and navigate to `/editor/{projectId}`.
  - Wired rename/delete flows to call API mutations and refresh, with delete redirecting to `/editor` when the active workspace is deleted.

## In Progress

- None.

## Next Up

- Begin the next feature unit on top of wired editor home project actions and workspace navigation flow.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- Completed implementation of `context/feature-specs/01-design-system.md` and validated with `npm run lint`.
- Completed implementation of `context/feature-specs/02-editor.md` and validated editor chrome behavior with lint checks.
- Completed implementation of `context/feature-specs/03-auth.md`, including provider wiring, `proxy.ts` route protection, auth pages, root redirects, and user menu integration.
- Updated auth page left panels to include an explicit compact logo mark + wordmark, matching the `03-auth` design requirement.
- Fixed auth redirect flow so `/` is public in `proxy.ts` and handles unauthenticated redirect to local `/sign-in` via `app/page.tsx`.
- Refined auth UI to a full 50/50 split with a tinted left panel, clearer visual separation from the dark form area, and explicit auth-page typography classes aligned with UI guidelines.
- Refined auth left panel visuals to better match target reference: darker surface panel, tighter heading/body hierarchy, boxed feature icons with title+description rows, and bottom-left copyright text.
- Increased left-panel typography scale and shifted layout to be more left-anchored (less visually centered), based on review feedback.
- Refactored auth left panel into reusable `components/auth/auth-left-panel.tsx` and redesigned icon treatment with softer accent chips for cleaner visuals and easier future tuning.
- Adjusted feature icon layout to avoid stretched icon columns: square configurable chips with title-aligned icons and indented descriptions.
- Updated feature rows so icon containers remain square while matching full right text-block height, with right text forced to no-wrap.
- Fixed auth feature rows so icons never overlap copy (grid + `minmax(0,1fr)` + `truncate`), and removed icon container borders.
- Darkened Clerk sign-in/sign-up form card background via `ClerkProvider` appearance element overrides in `app/layout.tsx`.
- Increased form card border contrast after darkening background by switching Clerk card border to `--border-subtle`.
- Refactored sign-in/sign-up pages to use shared `components/auth/auth-page-shell.tsx`, leaving route files focused on form component + props data only.
- Fixed post-logout redirect/render flow by forcing Clerk auth URLs to local routes and setting explicit `afterSignOutUrl` to `/sign-in`.
- Implemented `04-project-dialogs`: editor home screen, three project dialogs (create with slug preview, rename with prefilled input, delete with destructive confirm), sidebar project list with per-item actions, and mobile backdrop scrim. All verified with `tsc`, `eslint`, and `next build`.
- Increased project dialog text contrast by using stronger copy tokens in the dialog shell and explicit high-contrast input/slug styling.
- Increased project dialog title size and forced the title color to the primary white copy token.
- Added cancellation guards in `use-project-dialogs` so closing a dialog cancels in-flight mock submit updates and prevents stale project state writes after user cancel.
- Added submit re-entrancy guards in `use-project-dialogs` (`if (isSubmitting) return`) with minimal submit lifecycle cleanup to avoid duplicate rapid-fire project mutations.
- Added create-project validation in `use-project-dialogs` to block submit when slug sanitization results in an empty value.
- Updated create-project dialog UI to disable submit/Enter when slug is empty and show inline guidance when the entered name cannot produce a valid slug.
- Implemented `05-prisma`: added project/collaborator Prisma models with status enum, created cached `lib/prisma.ts` singleton with Accelerate vs `@prisma/adapter-pg` branching based on `DATABASE_URL`, and applied the first migration with client generation.
- Implemented `06-project-apis`: added `/api/projects` (`GET`/`POST`) and `/api/projects/[projectId]` (`PATCH`/`DELETE`) route handlers with Clerk auth checks, owner-only mutation enforcement, default create name behavior (`Untitled Project`), and build verification.
- Refactored duplicated API `401` response helper into shared `lib/http-responses.ts` and reused it across both project route handlers.
- Expanded `lib/http-responses.ts` into a shared API error response toolkit (`400`, `401`, `403`, `404`, `409`, `422`, `500`) and switched project mutation routes to use shared helpers.
- Implemented `07-wire-editor-home`: server-fetched owned/shared sidebar projects, API-backed create/rename/delete actions, room ID preview on create, and workspace navigation/redirect handling.
- Fixed editor runtime startup issues from `current-issue.md`: mapped `ProjectCollaborator.email` to existing DB column `collaboratorEmail`, switched shared-project lookup to collaborator-first query flow, and normalized pg adapter SSL mode to `verify-full` to remove the startup security warning. Verified with `npm run dev` (`GET /editor 200`).
