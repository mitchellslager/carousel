# AGENTS.md

`@mitchellslager/carousel` is a headless, accessible image carousel for React 19, driven by native CSS scroll snapping. The library lives in `packages/carousel`, the demo in `apps/demo`. Read `DESIGN.md` before changing behaviour or the public API: it records every design decision.

## Commits, branches and PRs

Write every commit message as a [Conventional Commit](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): summary`, with a lowercase, imperative summary.

- **Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`.
- **Scopes:** the area of the library (`core`, `components`, `a11y`, `styles`), or `demo`, `deps`. Leave the scope out when a change spans several areas.
- **Breaking changes** to the library's public API: add `!` after the type and a `BREAKING CHANGE:` footer.
- **Branches:** `<type>/<topic>`, e.g. `feat/thumbnails`.
- **PR titles** use the same format as commits. PRs are squash-merged, so the title becomes the commit on `main`.
- **Changesets:** a change users of the library will notice gets a changeset (`pnpm changeset`).

## Architecture rules

- `src/core/` is framework-agnostic DOM code (scroll tracking, geometry). It never imports React. The React components in `src/components/` build on it.
- Scroll position is the source of truth for the active slide. Components scroll the viewport; they never set the active index directly.
- The package ships only functional CSS, in `@layer carousel`. Visual styling belongs to consumers, through `data-*` attributes.
- No runtime dependencies besides React.

## Tests

Tests run in a real browser (Vitest browser mode with Playwright), because scroll snapping and scroll events need a layout engine. Locally they run in Chromium; CI also runs Firefox and WebKit. To run all three locally: `CI=1 pnpm test` after `pnpm --filter @mitchellslager/carousel exec playwright install firefox webkit`.

## Done means green

A change is done when `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:package` and `pnpm size` all pass from the repo root.
