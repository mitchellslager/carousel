import {
  useEffect,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react"

import { scrollIntoViewWithin } from "../core/geometry"
import { useCarouselContext } from "./context"
import {
  mergeProps,
  renderPart,
  useMergedRefs,
  type RenderProp,
} from "./render"

/* Viewport ---------------------------------------------------------------- */

export type ViewportProps = ComponentProps<"div">

/** The scroll-snap container. Its direct `Carousel.Slide` children are the slides. */
export function Viewport({ ref, children, ...props }: ViewportProps) {
  const { ids, initialIndex, setViewport } = useCarouselContext("Viewport")
  const mergedRef = useMergedRefs<HTMLDivElement>(setViewport, ref)

  const viewportProps = mergeProps(
    {
      id: ids.viewport,
      "data-carousel-viewport": ids.root,
      ref: mergedRef,
    },
    props
  )

  return (
    <div {...viewportProps}>
      {initialIndex > 0 && (
        // Puts the initial slide in view before hydration, where the browser
        // supports it. React hoists this into <head>.
        <style href={`carousel-initial-${ids.root}`} precedence="carousel">
          {`[data-carousel-viewport="${ids.root}"]>[data-carousel-slide]:nth-child(${initialIndex + 1} of [data-carousel-slide]){scroll-initial-target:nearest}`}
        </style>
      )}
      {children}
    </div>
  )
}

/* Slide ------------------------------------------------------------------- */

export type SlideProps = ComponentProps<"div">

/** One slide. Slides that are not active are `inert`. */
export function Slide({ ref, ...props }: SlideProps) {
  const { slides, activeIndex, hasThumbnails, labels, ids } =
    useCarouselContext("Slide")
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const mergedRef = useMergedRefs(setElement, ref)

  // Slides know their index only once mounted, from their DOM position.
  const index = element ? slides.indexOf(element) : -1
  const known = index !== -1
  const active = known && index === activeIndex

  const slideProps = mergeProps(
    {
      id: known ? ids.slide(index) : undefined,
      role: hasThumbnails ? "tabpanel" : "group",
      "aria-roledescription": labels.slide,
      "aria-label": known ? labels.slideLabel(index, slides.length) : undefined,
      inert: known && !active,
      "data-carousel-slide": "",
      "data-active": active ? "" : undefined,
      ref: mergedRef,
    },
    props
  )

  return <div {...slideProps} />
}

/* Prev / Next ------------------------------------------------------------- */

export interface NavigationProps extends ComponentProps<"button"> {
  /** Render as another element, for example `render={<MyButton />}`. */
  render?: RenderProp
}

function useNavigation(direction: 1 | -1, part: string) {
  const { activeIndex, slides, goTo, labels, ids } = useCarouselContext(part)
  const target = activeIndex + direction
  const disabled = target < 0 || target >= slides.length
  return {
    type: "button",
    "aria-label": direction === 1 ? labels.next : labels.previous,
    "aria-controls": ids.viewport,
    // aria-disabled instead of disabled, so focus stays on the button.
    "aria-disabled": disabled || undefined,
    "data-disabled": disabled ? "" : undefined,
    onClick: () => {
      if (!disabled) goTo(target, "control")
    },
  }
}

/** Scrolls to the previous slide. `aria-disabled` on the first slide. */
export function Prev({ render, ...props }: NavigationProps) {
  const internal = useNavigation(-1, "Prev")
  return renderPart("button", mergeProps(internal, props), render)
}

/** Scrolls to the next slide. `aria-disabled` on the last slide. */
export function Next({ render, ...props }: NavigationProps) {
  const internal = useNavigation(1, "Next")
  return renderPart("button", mergeProps(internal, props), render)
}

/* Counter ----------------------------------------------------------------- */

export interface CounterState {
  /** Zero-based index of the active slide. */
  index: number
  total: number
}

export interface CounterProps extends Omit<ComponentProps<"span">, "children"> {
  /** Custom content. Defaults to "3 / 10". */
  children?: (state: CounterState) => ReactNode
}

const defaultCounter = ({ index, total }: CounterState) =>
  `${index + 1} / ${total}`

/**
 * Shows the position, such as "3 / 10". Hidden from assistive technology:
 * slide labels and the live region already convey it. Empty until the slides
 * are known, so also during server rendering.
 */
export function Counter({ children = defaultCounter, ...props }: CounterProps) {
  const { activeIndex, slides } = useCarouselContext("Counter")
  const total = slides.length
  const counterProps = mergeProps(
    { "aria-hidden": true, "data-carousel-counter": "" },
    props
  )
  return (
    <span {...counterProps}>
      {total > 0 ? children({ index: activeIndex, total }) : null}
    </span>
  )
}

/* Thumbnails -------------------------------------------------------------- */

export interface ThumbnailsProps extends ComponentProps<"div"> {
  /** Layout direction; decides which arrow keys move between thumbnails. */
  orientation?: "horizontal" | "vertical"
}

const NEXT_KEYS = {
  horizontal: { ltr: "ArrowRight", rtl: "ArrowLeft" },
  vertical: { ltr: "ArrowDown", rtl: "ArrowDown" },
} as const

const PREVIOUS_KEYS = {
  horizontal: { ltr: "ArrowLeft", rtl: "ArrowRight" },
  vertical: { ltr: "ArrowUp", rtl: "ArrowUp" },
} as const

/**
 * A tab list of thumbnails, one per slide. Arrow keys, Home and End move
 * between thumbnails and select them at once.
 */
export function Thumbnails({
  orientation = "horizontal",
  ...props
}: ThumbnailsProps) {
  const { labels, setHasThumbnails } = useCarouselContext("Thumbnails")

  useEffect(() => {
    setHasThumbnails(true)
    return () => setHasThumbnails(false)
  }, [setHasThumbnails])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const list = event.currentTarget
    const tabs = [
      ...list.querySelectorAll<HTMLElement>("[data-carousel-thumbnail]"),
    ]
    const current = tabs.findIndex((tab) => tab.contains(event.target as Node))
    if (current === -1) return

    const direction = getComputedStyle(list).direction === "rtl" ? "rtl" : "ltr"
    let next: number
    if (event.key === NEXT_KEYS[orientation][direction]) {
      next = (current + 1) % tabs.length
    } else if (event.key === PREVIOUS_KEYS[orientation][direction]) {
      next = (current - 1 + tabs.length) % tabs.length
    } else if (event.key === "Home") {
      next = 0
    } else if (event.key === "End") {
      next = tabs.length - 1
    } else {
      return
    }

    event.preventDefault()
    const tab = tabs[next]
    tab?.focus()
    // Automatic activation: moving to a tab selects it.
    tab?.click()
  }

  const listProps = mergeProps(
    {
      role: "tablist",
      "aria-label": labels.thumbnails,
      "aria-orientation": orientation,
      "data-carousel-thumbnails": "",
      "data-orientation": orientation,
      onKeyDown: handleKeyDown,
    },
    props
  )

  return <div {...listProps} />
}

export interface ThumbnailProps extends ComponentProps<"button"> {
  /** The zero-based index of the slide this thumbnail selects. */
  index: number
  /** Render as another element, for example `render={<MyButton />}`. */
  render?: RenderProp
}

/** A tab that selects slide `index`. Keeps itself in view when active. */
export function Thumbnail({ index, render, ref, ...props }: ThumbnailProps) {
  const { activeIndex, slides, goTo, labels, ids, behavior } =
    useCarouselContext("Thumbnail")
  const [element, setElement] = useState<HTMLButtonElement | null>(null)
  const mergedRef = useMergedRefs(setElement, ref)
  const selected = index === activeIndex

  useEffect(() => {
    const list = element?.closest<HTMLElement>("[data-carousel-thumbnails]")
    if (selected && element && list) {
      scrollIntoViewWithin(list, element, behavior)
    }
  }, [selected, element, behavior])

  const internal = {
    type: "button",
    role: "tab",
    id: ids.tab(index),
    "aria-selected": selected,
    "aria-controls": ids.slide(index),
    "aria-label": labels.thumbnailLabel(index, slides.length),
    // Roving tabindex: only the selected thumbnail is in the tab order.
    tabIndex: selected ? 0 : -1,
    "data-carousel-thumbnail": "",
    "data-active": selected ? "" : undefined,
    ref: mergedRef,
    onClick: () => goTo(index, "tab"),
  }

  return renderPart("button", mergeProps(internal, props), render)
}
