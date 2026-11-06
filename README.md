# @mitchellslager/carousel

A headless, accessible image carousel for React 19, driven by native CSS scroll snapping.

- Thumbnail navigation, synchronised with the carousel
- A "3 / 10" counter
- The WAI-ARIA carousel pattern, with translatable labels
- Respects `prefers-reduced-motion`

> Not published to npm yet. [DESIGN.md](DESIGN.md) records the design decisions.

## Usage

```bash
pnpm add @mitchellslager/carousel
```

```tsx
import { Carousel } from "@mitchellslager/carousel"
import "@mitchellslager/carousel/styles.css"

export function ProductGallery({
  images,
}: {
  images: { src: string; alt: string }[]
}) {
  return (
    <Carousel.Root aria-label="Product images">
      <Carousel.Viewport>
        {images.map((image) => (
          <Carousel.Slide key={image.src}>
            <img src={image.src} alt={image.alt} />
          </Carousel.Slide>
        ))}
      </Carousel.Viewport>
      <Carousel.Prev>←</Carousel.Prev>
      <Carousel.Counter />
      <Carousel.Next>→</Carousel.Next>
      <Carousel.Thumbnails>
        {images.map((image, index) => (
          <Carousel.Thumbnail key={image.src} index={index}>
            <img src={image.src} alt="" />
          </Carousel.Thumbnail>
        ))}
      </Carousel.Thumbnails>
    </Carousel.Root>
  )
}
```

Give `Root` an accessible name with `aria-label` or `aria-labelledby`. Every part is optional and can be placed anywhere inside `Root`.

### Parts

| Part           | Renders  | Notes                                                            |
| -------------- | -------- | ---------------------------------------------------------------- |
| `Root`         | `div`    | `index` / `defaultIndex` / `onIndexChange`, `labels`, `motion`.  |
| `Viewport`     | `div`    | The scroll-snap container. Its `Slide` children are the slides.  |
| `Slide`        | `div`    | `inert` unless active. `data-active` when active.                |
| `Prev`, `Next` | `button` | `aria-disabled` and `data-disabled` at the edges. `render` prop. |
| `Counter`      | `span`   | "3 / 10" by default; pass a function child to change it.         |
| `Thumbnails`   | `div`    | Tab list; `orientation` is `"horizontal"` or `"vertical"`.       |
| `Thumbnail`    | `button` | Tab for slide `index`. `data-active` when active. `render` prop. |

### State

`onIndexChange` fires once scrolling settles on a new slide. Pass `index` to request a slide from outside: changing it scrolls there, but a swipe always wins and reports itself through `onIndexChange`. To reset the carousel, for example when a product variant changes its images, give `Root` a new `key`.

### Labels

All accessible text is English by default. Translate it with `labels`:

```tsx
<Carousel.Root
  aria-label="Productafbeeldingen"
  labels={{
    carousel: "carrousel",
    slideLabel: (index, total) => `${index + 1} van ${total}`,
    previous: "Vorige afbeelding",
    next: "Volgende afbeelding",
    thumbnails: "Afbeeldingen",
    thumbnailLabel: (index) => `Afbeelding ${index + 1}`,
    announcement: (index, total) => `Afbeelding ${index + 1} van ${total}`,
  }}
>
```

### Motion

The carousel scrolls smoothly, and jumps instead when the user prefers reduced motion. Pass `motion="reduce"` to always jump.

### Custom elements

`Prev`, `Next` and `Thumbnail` take a `render` prop to render as your own component. Props are merged: class names are joined, and your event handlers run first (call `event.preventDefault()` to skip the carousel's own).

```tsx
<Carousel.Next render={<Button variant="ghost" />}>Next</Carousel.Next>
```

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
