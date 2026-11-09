import { Carousel } from "@mitchellslager/carousel"
import { useState } from "react"

interface Picture {
  label: string
  hue: number
}

const VARIANTS: Record<string, Picture[]> = {
  ocean: [
    { label: "Front", hue: 200 },
    { label: "Side", hue: 210 },
    { label: "Back", hue: 220 },
    { label: "Sole", hue: 190 },
    { label: "Detail", hue: 230 },
    { label: "Box", hue: 180 },
    { label: "Worn", hue: 240 },
  ],
  ember: [
    { label: "Front", hue: 10 },
    { label: "Side", hue: 25 },
    { label: "Back", hue: 40 },
    { label: "Detail", hue: 0 },
  ],
}

/** A placeholder product photo: an SVG gradient with a caption. */
function pictureSource({ hue, label }: Picture) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs><linearGradient id="g" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 55%)"/>
      <stop offset="1" stop-color="hsl(${hue + 40} 70% 35%)"/>
    </linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <text x="200" y="165" fill="white" font-family="system-ui" font-size="40"
      font-weight="600" text-anchor="middle">${label}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function Artwork({
  picture,
  size,
}: {
  picture: Picture
  size: "large" | "small"
}) {
  return (
    <img
      src={pictureSource(picture)}
      alt={size === "large" ? picture.label : ""}
      draggable={false}
      className={
        size === "large"
          ? "aspect-[4/3] w-full object-cover"
          : "size-full object-cover"
      }
    />
  )
}

const buttonClass =
  "rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-neutral-900 shadow data-[disabled]:opacity-40"

function Gallery({
  pictures,
  orientation = "horizontal",
  ...rootProps
}: {
  pictures: Picture[]
  orientation?: "horizontal" | "vertical"
} & Omit<Carousel.RootProps, "children">) {
  const vertical = orientation === "vertical"
  return (
    <Carousel.Root
      className={
        vertical ? "flex flex-row-reverse gap-3" : "flex flex-col gap-3"
      }
      {...rootProps}
    >
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl">
        <Carousel.Viewport>
          {pictures.map((picture, i) => (
            <Carousel.Slide key={i}>
              <Artwork picture={picture} size="large" />
            </Carousel.Slide>
          ))}
        </Carousel.Viewport>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <Carousel.Prev className={buttonClass}>←</Carousel.Prev>
          <Carousel.Counter className="rounded-full bg-black/60 px-3 py-1 text-sm text-white tabular-nums" />
          <Carousel.Next className={buttonClass}>→</Carousel.Next>
        </div>
      </div>
      <Carousel.Thumbnails
        orientation={orientation}
        // Vertical: contain-size stops the strip from adding to the row's
        // height, so it stretches to the slide's height and scrolls instead.
        className={vertical ? "w-16 gap-2 contain-size" : "gap-2"}
      >
        {pictures.map((picture, i) => (
          <Carousel.Thumbnail
            key={i}
            index={i}
            className="size-16 overflow-hidden rounded-lg opacity-60 ring-blue-600 transition focus-visible:outline-2 focus-visible:outline-offset-2 data-[active]:opacity-100 data-[active]:ring-2 data-[active]:ring-inset"
          >
            <Artwork picture={picture} size="small" />
          </Carousel.Thumbnail>
        ))}
      </Carousel.Thumbnails>
    </Carousel.Root>
  )
}

function ControlledExample() {
  const [variant, setVariant] = useState<keyof typeof VARIANTS>("ocean")
  const [index, setIndex] = useState(0)
  const [log, setLog] = useState<number[]>([])
  const pictures = VARIANTS[variant]!

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Object.keys(VARIANTS).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={variant === name}
            onClick={() => {
              setVariant(name)
              setIndex(0)
            }}
            className="rounded-full border px-3 py-1 text-sm capitalize aria-pressed:bg-neutral-900 aria-pressed:text-white dark:aria-pressed:bg-white dark:aria-pressed:text-neutral-900"
          >
            {name}
          </button>
        ))}
        {pictures.map((picture, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="rounded border px-2 py-1 text-sm"
          >
            Show {picture.label.toLowerCase()}
          </button>
        ))}
      </div>
      {/* `key` resets the carousel when the variant changes. */}
      <Gallery
        key={variant}
        aria-label={`${variant} shoe`}
        pictures={pictures}
        index={index}
        onIndexChange={(next) => {
          setIndex(next)
          setLog((entries) => [...entries.slice(-4), next])
        }}
      />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        onIndexChange: {log.length ? log.map((i) => i + 1).join(", ") : "—"}
      </p>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  )
}

export function App() {
  const [reduceMotion, setReduceMotion] = useState(false)
  const [rtl, setRtl] = useState(false)
  const motion = reduceMotion ? "reduce" : "auto"

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="mx-auto max-w-xl space-y-12 p-6 font-sans"
    >
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">@mitchellslager/carousel</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          A headless, accessible image carousel for React, driven by native CSS
          scroll snapping. Swipe, use the buttons, or tab to the thumbnails and
          use the arrow keys.
        </p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setReduceMotion(event.target.checked)}
            />
            Reduce motion
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rtl}
              onChange={(event) => setRtl(event.target.checked)}
            />
            Right to left
          </label>
        </div>
      </header>

      <Section
        title="Thumbnails"
        description="Thumbnails form a tab list that follows the carousel and keeps the active one in view."
      >
        <Gallery
          aria-label="Ocean shoe"
          pictures={VARIANTS.ocean!}
          motion={motion}
        />
      </Section>

      <Section
        title="Vertical thumbnails"
        description="Up and down arrows move between thumbnails; it starts on the third slide."
      >
        <Gallery
          aria-label="Ocean shoe, vertical"
          pictures={VARIANTS.ocean!}
          orientation="vertical"
          defaultIndex={2}
          motion={motion}
        />
      </Section>

      <Section
        title="Controlled"
        description="The parent requests a slide; swipes still win and report through onIndexChange. Switching variants resets the carousel."
      >
        <ControlledExample />
      </Section>
    </main>
  )
}
