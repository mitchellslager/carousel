# Design

`@mitchellslager/carousel` is a headless, accessible image carousel for React 19: one slide per view, synchronised thumbnails, a "3 / 10" counter, the WAI-ARIA carousel pattern, and respect for `prefers-reduced-motion`. Native CSS scroll snapping does the moving; a small amount of JavaScript keeps state, controls and accessibility in sync.

This document records the decisions behind the API. Change it when a decision changes.

## Scope

In scope for v1:

- One slide per view, horizontal only.
- Thumbnail navigation, synchronised with the carousel.
- Counter ("3 / 10").
- WAI-ARIA carousel pattern, translatable labels.
- `prefers-reduced-motion`.
- Right-to-left layouts.

Out of scope for v1: autoplay, loop or rewind, several slides per view, a vertical main carousel, and image handling (lazy loading or preloading). Consumers bring their own `<img loading="lazy">` or `next/image`.

## Platform

- React 19 or later, client components only. The entry starts with `"use client"`, so a Server Component can import and render it in the Next.js App Router.
- Every modern browser. The carousel does **not** use `::scroll-button()` or `::scroll-marker`: they are Chromium-only, and thumbnails, the counter and the live region need JavaScript anyway. Controls are real DOM elements.
- No runtime dependencies besides React. React Aria is deliberately not used: it has no carousel primitive, and the ARIA pattern here is small enough to own.

## API shape

Compound components:

```tsx
<Carousel.Root>
  <Carousel.Viewport>
    <Carousel.Slide>…</Carousel.Slide>
  </Carousel.Viewport>
  <Carousel.Prev />
  <Carousel.Next />
  <Carousel.Counter />
  <Carousel.Thumbnails>
    <Carousel.Thumbnail index={0}>…</Carousel.Thumbnail>
  </Carousel.Thumbnails>
</Carousel.Root>
```

- Every part is optional and can be placed anywhere inside `Root`.
- Controls are polymorphic through a `render` prop (`<Carousel.Next render={<MyButton />} />`), not `asChild`.
- `Counter` takes a render function for its content: `{({ index, total }) => …}`.
- A lower-level `useCarousel` hook may follow later.

## State

- **Scroll position is the source of truth.** Buttons, thumbnails and the controlled prop only call `scrollTo`; the active index always comes from what is scrolled into view. React state never drives the scroll position directly, which avoids feedback loops during smooth scrolling.
- **Two indexes.** The live _active_ index follows the slide nearest the viewport centre while scrolling, so the counter and thumbnails react at once. The _settled_ index updates when scrolling ends; only that one calls `onIndexChange`, so analytics and URL sync see final values only.
- **Settling** uses the `scrollend` event where the browser has it, and a short debounce after the last `scroll` event where it does not. (`scrollsnapchange` is Chromium-only, so one code path based on `scrollend` serves every engine.)
- **Controlled and uncontrolled:** `index` / `onIndexChange` / `defaultIndex`. Controlled means "requested position": a change to `index` scrolls there, but a swipe always wins and reports itself through `onIndexChange`.
- **Initial position:** the slide at `defaultIndex` gets `scroll-initial-target: nearest`, which positions it before hydration in Chromium; a layout effect with an instant scroll covers other browsers.
- **Slide count and order** come from the DOM: the viewport's `[data-carousel-slide]` children, watched with a `MutationObserver`. Thumbnails carry an explicit `index`, because they may be rendered in another order or as a subset.
- **Fewer slides:** when slides disappear, the index clamps to the last slide. To reset completely, consumers set `key` on `Root` (for example `key={variantId}`).
- **Edges:** at the first and last slide, Prev and Next get `aria-disabled` (not `disabled`, so focus is not lost).

## Thumbnails

- Content is supplied by the consumer and linked to a slide by `index`.
- The strip scrolls itself and keeps the active thumbnail in view with `scrollIntoView({ block: "nearest", inline: "nearest" })`, without scrolling the page.
- `orientation` is `"horizontal"` or `"vertical"` and decides which arrow keys move between thumbnails.

## Accessibility

Follows the WAI-ARIA Authoring Practices carousel pattern.

- With `Thumbnails`: the tabbed variant. Thumbnails form a `tablist` of `tab`s with roving `tabindex` and automatic activation (arrow keys select and scroll); Home and End jump to the first and last thumbnail. Slides are `tabpanel`s.
- Without `Thumbnails`: the basic variant. Slides are `role="group"`. `Root` detects which variant applies; consumers do nothing.
- `Root` is `role="region"` with `aria-roledescription="carousel"`. Slides have `aria-roledescription="slide"` and an `aria-label` such as "3 of 10".
- A polite live region announces slide changes, except changes that come from a thumbnail tab, which the screen reader already announces. The visible counter is `aria-hidden` for the same reason.
- Slides that are not active are `inert`, so focus never lands in a slide out of view.
- All text comes from a `labels` object on `Root`, with English defaults and functions for dynamic text (`slideLabel: (index, total) => …`).
- Arrow keys and Prev/Next follow the writing direction: in RTL, "next" points left.

## Motion

- `styles.css` sets `scroll-behavior: smooth`, and `auto` under `prefers-reduced-motion: reduce`.
- Programmatic scrolls read the same media query through `matchMedia` and follow changes to it.
- A `motion` prop (`"auto" | "reduce"`) lets an app force reduced motion. Nothing ever forces animation when the user asked for reduced motion.

## Styling

- The package is headless. It ships `styles.css` with only the functional base (layout, snapping, hidden scrollbar, reduced motion) inside `@layer carousel`, so any unlayered consumer style wins.
- Cascade layers declared later win over earlier ones. Consumers using Tailwind (or other layered CSS) declare `@layer carousel;` before their own layers, so their utilities override the base styles. The README documents this.
- State is exposed as `data-*` attributes (`data-active`, `data-disabled`, `data-orientation`) for styling, including Tailwind variants such as `data-[active]:ring-2`.
- Tailwind is used only in the demo app.

## Tooling

- pnpm workspace: the library in `packages/carousel`, a Vite demo in `apps/demo`, deployed to GitHub Pages.
- ESM only, built with tsdown. `react` and `react-dom` are peer dependencies.
- TypeScript `strict` with `noUncheckedIndexedAccess`.
- oxlint (including `jsx-a11y`) and Prettier.
- Tests run in Vitest browser mode with Playwright, because scroll snapping needs a real layout engine: Chromium locally, Chromium, Firefox and WebKit in CI.
- `publint`, `@arethetypeswrong/cli` and `size-limit` (4 kB min+gzip for the JavaScript) run in CI.
- Changesets for versions and the changelog; npm trusted publishing with provenance from GitHub Actions.
