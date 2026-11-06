# @mitchellslager/carousel

A headless, accessible image carousel for React 19, driven by native CSS scroll snapping.

- Thumbnail navigation, synchronised with the carousel
- A "3 / 10" counter
- The WAI-ARIA carousel pattern, with translatable labels
- Respects `prefers-reduced-motion`

> Work in progress: the React components are not published yet. See [DESIGN.md](DESIGN.md) for the planned API.

## Styling

Import the base styles once:

```ts
import "@mitchellslager/carousel/styles.css"
```

They only handle layout, snapping and reduced motion, inside `@layer carousel`. Unlayered CSS of your own always wins. If you use Tailwind or other cascade layers, declare the carousel layer first so your utilities override it:

```css
@layer carousel;
@import "tailwindcss";
```

## Development

```bash
pnpm install
pnpm dev
```

See [AGENTS.md](AGENTS.md) for conventions and the checks a change must pass.

## License

MIT
