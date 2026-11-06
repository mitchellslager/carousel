/**
 * Tracks which slide of a horizontal scroll-snap viewport is in view.
 *
 * The scroll position is the source of truth: this module only reads it, and
 * moves it through `scrollToIndex`. It reports two indexes:
 *
 * - the **active** index, updated live (once per frame) while scrolling, for
 *   UI that should react at once, such as the counter and thumbnails;
 * - the **settled** index, updated when scrolling ends, for consumers that
 *   should only see final values, such as `onIndexChange`.
 *
 * Positions are compared through `getBoundingClientRect`, so the same code
 * works for left-to-right and right-to-left layouts.
 */

export interface ScrollTrackerOptions {
  /** Returns the slides in DOM order. Called on every measurement. */
  getSlides: () => readonly HTMLElement[]
  /** Called when the slide nearest the viewport centre changes. */
  onActiveChange: (index: number) => void
  /** Called when scrolling ends on a different slide than before. */
  onSettle: (index: number) => void
  /**
   * How to detect the end of scrolling. `"auto"` uses the `scrollend` event
   * where the browser has it, and a debounce after the last `scroll` event
   * elsewhere.
   */
  settle?: "auto" | "scrollend" | "debounce"
  /** Debounce delay in milliseconds when settling through the fallback. */
  settleDelay?: number
}

export interface ScrollTracker {
  readonly activeIndex: number
  readonly settledIndex: number
  /** Scrolls the slide at `index` (clamped to the slides) into the centre. */
  scrollToIndex(index: number, behavior?: ScrollBehavior): void
  /** Re-measures and settles at once, for example after slides changed. */
  update(): void
  destroy(): void
}

const DEFAULT_SETTLE_DELAY = 100

function horizontalCentre(element: Element) {
  const rect = element.getBoundingClientRect()
  return rect.left + rect.width / 2
}

/**
 * Returns the index of the slide whose centre is nearest the viewport's
 * centre, or -1 when there are no slides.
 */
export function findNearestSlide(
  viewport: HTMLElement,
  slides: readonly HTMLElement[]
): number {
  const centre = horizontalCentre(viewport)
  let nearest = -1
  let nearestDistance = Infinity
  slides.forEach((slide, index) => {
    const distance = Math.abs(horizontalCentre(slide) - centre)
    if (distance < nearestDistance) {
      nearest = index
      nearestDistance = distance
    }
  })
  return nearest
}

export function createScrollTracker(
  viewport: HTMLElement,
  options: ScrollTrackerOptions
): ScrollTracker {
  const {
    getSlides,
    onActiveChange,
    onSettle,
    settle = "auto",
    settleDelay = DEFAULT_SETTLE_DELAY,
  } = options
  const useScrollEnd =
    settle === "scrollend" || (settle === "auto" && "onscrollend" in window)

  const initialIndex = Math.max(0, findNearestSlide(viewport, getSlides()))
  let activeIndex = initialIndex
  let settledIndex = initialIndex
  let frame = 0
  let settleTimer: ReturnType<typeof setTimeout> | undefined

  function measure() {
    frame = 0
    const index = findNearestSlide(viewport, getSlides())
    if (index !== -1 && index !== activeIndex) {
      activeIndex = index
      onActiveChange(index)
    }
  }

  function settleNow() {
    cancelAnimationFrame(frame)
    clearTimeout(settleTimer)
    measure()
    if (activeIndex !== settledIndex) {
      settledIndex = activeIndex
      onSettle(activeIndex)
    }
  }

  function handleScroll() {
    if (!frame) frame = requestAnimationFrame(measure)
    if (!useScrollEnd) {
      clearTimeout(settleTimer)
      settleTimer = setTimeout(settleNow, settleDelay)
    }
  }

  viewport.addEventListener("scroll", handleScroll, { passive: true })
  if (useScrollEnd) viewport.addEventListener("scrollend", settleNow)

  return {
    get activeIndex() {
      return activeIndex
    },
    get settledIndex() {
      return settledIndex
    },
    scrollToIndex(index, behavior = "auto") {
      const slides = getSlides()
      const target = slides[Math.min(Math.max(index, 0), slides.length - 1)]
      if (!target) return
      const delta = horizontalCentre(target) - horizontalCentre(viewport)
      // Sub-pixel differences are rounding, not a different slide.
      if (Math.abs(delta) < 1) return
      viewport.scrollBy({ left: delta, behavior })
    },
    update: settleNow,
    destroy() {
      cancelAnimationFrame(frame)
      clearTimeout(settleTimer)
      viewport.removeEventListener("scroll", handleScroll)
      viewport.removeEventListener("scrollend", settleNow)
    },
  }
}
