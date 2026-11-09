import { Carousel } from "@mitchellslager/carousel"
import { useState } from "react"

const SETS = { seven: 7, four: 4 } as const
type SetName = keyof typeof SETS

const range = (count: number) => Array.from({ length: count }, (_, i) => i)

const outline = "ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700"

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      // Mirror the arrows in right-to-left layouts, where "next" is leftwards.
      className="size-4 rtl:-scale-x-100"
    >
      <path
        d={direction === "previous" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const buttonClass = `grid size-9 place-items-center rounded-full ${outline} transition hover:bg-neutral-100 data-[disabled]:opacity-30 data-[disabled]:hover:bg-transparent dark:hover:bg-neutral-900`

function Gallery({
  count,
  orientation = "horizontal",
  thumbnails = true,
  ...rootProps
}: {
  count: number
  orientation?: "horizontal" | "vertical"
  thumbnails?: boolean
} & Omit<Carousel.RootProps, "children">) {
  const vertical = thumbnails && orientation === "vertical"
  return (
    <Carousel.Root
      className={`grid gap-3 ${vertical ? "grid-cols-[3.5rem_1fr]" : ""}`}
      {...rootProps}
    >
      <Carousel.Viewport className={vertical ? "col-start-2" : ""}>
        {range(count).map((i) => (
          <Carousel.Slide
            key={i}
            className={`grid aspect-video place-items-center rounded-2xl text-5xl font-semibold tabular-nums ${outline}`}
          >
            {i + 1}
          </Carousel.Slide>
        ))}
      </Carousel.Viewport>
      <div
        className={`flex items-center gap-2 ${vertical ? "col-start-2" : ""}`}
      >
        <Carousel.Prev className={buttonClass}>
          <Arrow direction="previous" />
        </Carousel.Prev>
        <Carousel.Next className={buttonClass}>
          <Arrow direction="next" />
        </Carousel.Next>
        <Carousel.Counter className="ms-auto text-sm text-neutral-500 tabular-nums" />
      </div>
      {thumbnails && (
        <Carousel.Thumbnails
          orientation={orientation}
          // Vertical: the strip sits beside the slides. contain-size stops it
          // from adding to the row's height, so it stretches to the slide's
          // height and scrolls instead.
          className={
            vertical ? "col-start-1 row-start-1 gap-2 contain-size" : "gap-2"
          }
        >
          {range(count).map((i) => (
            <Carousel.Thumbnail
              key={i}
              index={i}
              className={`size-14 rounded-xl font-medium text-neutral-500 tabular-nums transition ${outline} focus-visible:outline-2 focus-visible:outline-offset-2 data-[active]:text-neutral-900 data-[active]:ring-neutral-900 dark:data-[active]:text-white dark:data-[active]:ring-white`}
            >
              {i + 1}
            </Carousel.Thumbnail>
          ))}
        </Carousel.Thumbnails>
      )}
    </Carousel.Root>
  )
}

function ControlledExample() {
  const [set, setSet] = useState<SetName>("seven")
  const [index, setIndex] = useState(0)
  const [log, setLog] = useState<number[]>([])
  const count = SETS[set]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SETS) as SetName[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={set === name}
            onClick={() => {
              setSet(name)
              setIndex(0)
            }}
            className={`rounded-full px-3 py-1 text-sm ${outline} aria-pressed:bg-neutral-900 aria-pressed:text-white aria-pressed:ring-neutral-900 dark:aria-pressed:bg-white dark:aria-pressed:text-neutral-900 dark:aria-pressed:ring-white`}
          >
            {SETS[name]} slides
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {range(count).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}`}
            className={`size-8 rounded-lg text-sm tabular-nums ${outline}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {/* `key` resets the carousel when the set changes. */}
      <Gallery
        key={set}
        aria-label={`${count} slides`}
        count={count}
        thumbnails={false}
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
        <Gallery aria-label="Thumbnails" count={7} motion={motion} />
      </Section>

      <Section
        title="Vertical thumbnails"
        description="Up and down arrows move between thumbnails; it starts on the third slide."
      >
        <Gallery
          aria-label="Vertical thumbnails"
          count={7}
          orientation="vertical"
          defaultIndex={2}
          motion={motion}
        />
      </Section>

      <Section
        title="Controlled"
        description="The parent requests a slide; swipes still win and report through onIndexChange. Switching sets resets the carousel."
      >
        <ControlledExample />
      </Section>
    </main>
  )
}
