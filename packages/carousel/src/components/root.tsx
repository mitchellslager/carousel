import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react"

import { scrollSlideIntoCentre } from "../core/geometry"
import { createScrollTracker, type ScrollTracker } from "../core/scroll-tracker"
import {
  CarouselContext,
  type CarouselContextValue,
  type ChangeSource,
} from "./context"
import { defaultLabels, type CarouselLabels } from "./labels"
import { mergeProps } from "./render"
import { usePrefersReducedMotion } from "./use-reduced-motion"

export interface RootProps extends Omit<ComponentProps<"div">, "onChange"> {
  /**
   * The requested slide (controlled). Changing it scrolls there, but a swipe
   * always wins and reports itself through `onIndexChange`.
   */
  index?: number
  /** The slide to start on (uncontrolled). Defaults to 0. */
  defaultIndex?: number
  /** Called once scrolling settles on a different slide. */
  onIndexChange?: (index: number) => void
  /** Overrides for the accessible texts. */
  labels?: Partial<CarouselLabels>
  /**
   * `"auto"` follows the user's `prefers-reduced-motion` setting; `"reduce"`
   * always jumps instead of scrolling smoothly.
   */
  motion?: "auto" | "reduce"
}

const SLIDE_SELECTOR = ":scope > [data-carousel-slide]"

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
}

/** Keeps the latest value in a ref, for use inside long-lived callbacks. */
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

export function Root({
  index,
  defaultIndex = 0,
  onIndexChange,
  labels: labelOverrides,
  motion = "auto",
  children,
  ...props
}: RootProps) {
  const baseId = useId()
  const [initialIndex] = useState(() => index ?? defaultIndex)
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  const [slides, setSlides] = useState<readonly HTMLElement[]>([])
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [hasThumbnails, setHasThumbnails] = useState(false)
  const [announcement, setAnnouncement] = useState("")
  const trackerRef = useRef<ScrollTracker | null>(null)
  const sourceRef = useRef<ChangeSource | null>(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const behavior: ScrollBehavior =
    motion === "reduce" || prefersReducedMotion ? "instant" : "smooth"

  const labels = useMemo(
    () => ({ ...defaultLabels, ...labelOverrides }),
    [labelOverrides]
  )
  const labelsRef = useLatest(labels)
  const onIndexChangeRef = useLatest(onIndexChange)
  const behaviorRef = useLatest(behavior)

  useLayoutEffect(() => {
    if (!viewport) return
    const getSlides = () => [
      ...viewport.querySelectorAll<HTMLElement>(SLIDE_SELECTOR),
    ]

    // Jump to the initial slide before tracking starts, so the jump is not
    // reported as a change. In Chromium, `scroll-initial-target` (see
    // Viewport) has already put it there.
    const initialSlides = getSlides()
    const initialSlide =
      initialSlides[Math.min(initialIndex, initialSlides.length - 1)]
    if (initialSlide) scrollSlideIntoCentre(viewport, initialSlide, "instant")

    const tracker = createScrollTracker(viewport, {
      getSlides,
      onActiveChange: setActiveIndex,
      onSettle: (settled) => {
        // A tab change is announced by the tab itself; announcing it here
        // too would make screen readers say it twice.
        if (sourceRef.current !== "tab") {
          const total = getSlides().length
          setAnnouncement(labelsRef.current.announcement(settled, total))
        }
        sourceRef.current = null
        onIndexChangeRef.current?.(settled)
      },
    })
    trackerRef.current = tracker
    // The slides and their position live in the DOM, which only exists once
    // mounted, so this effect is where React first learns about them.
    // oxlint-disable-next-line react/set-state-in-effect
    setSlides(initialSlides)
    // oxlint-disable-next-line react/set-state-in-effect
    setActiveIndex(tracker.activeIndex)

    const observer = new MutationObserver(() => {
      setSlides(getSlides())
      tracker.update()
    })
    observer.observe(viewport, { childList: true })

    return () => {
      observer.disconnect()
      tracker.destroy()
      trackerRef.current = null
    }
  }, [viewport, initialIndex, labelsRef, onIndexChangeRef])

  // Controlled: a new `index` requests a scroll. If the parent keeps the old
  // value after a swipe, nothing happens, so the swipe wins.
  useEffect(() => {
    if (index === undefined) return
    if (trackerRef.current?.scrollToIndex(index, behaviorRef.current)) {
      sourceRef.current = "control"
    }
  }, [index, behaviorRef])

  const goTo = useCallback(
    (target: number, source: ChangeSource) => {
      if (trackerRef.current?.scrollToIndex(target, behavior)) {
        sourceRef.current = source
      }
    },
    [behavior]
  )

  const context = useMemo<CarouselContextValue>(
    () => ({
      activeIndex,
      initialIndex,
      slides,
      hasThumbnails,
      setHasThumbnails,
      setViewport,
      goTo,
      behavior,
      labels,
      ids: {
        root: baseId,
        viewport: `${baseId}-viewport`,
        slide: (i) => `${baseId}-slide-${i}`,
        tab: (i) => `${baseId}-tab-${i}`,
      },
    }),
    [
      activeIndex,
      initialIndex,
      slides,
      hasThumbnails,
      goTo,
      behavior,
      labels,
      baseId,
    ]
  )

  const rootProps = mergeProps(
    {
      id: baseId,
      role: "region",
      "aria-roledescription": labels.carousel,
      "data-carousel-root": "",
    },
    props
  )

  return (
    <CarouselContext value={context}>
      <div {...rootProps}>
        {children}
        <div aria-live="polite" aria-atomic="true" style={visuallyHidden}>
          {announcement}
        </div>
      </div>
    </CarouselContext>
  )
}
