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
 * Positions come from ./geometry, which works for left-to-right and
 * right-to-left layouts alike.
 */

import { findNearestSlide, isCentred, scrollSlideIntoCentre } from "./geometry"

export { findNearestSlide } from "./geometry"

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
  /**
   * Scrolls the slide at `index` (clamped to the slides) into the centre.
   * Returns whether it had to scroll.
   */
  scrollToIndex(index: number, behavior?: ScrollBehavior): boolean
  /** Re-measures and settles at once, for example after slides changed. */
  update(): void
  /**
   * Holds back settling, for example while a mouse drag moves the viewport:
   * the active index still follows, but pauses in scrolling do not settle.
   */
  suspend(): void
  /** Lifts `suspend` and settles at once. */
  resume(): void
  destroy(): void
}

const DEFAULT_SETTLE_DELAY = 100
/** Milliseconds without resizing after which the active slide is let go. */
const RESIZE_QUIET = 250

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
  let suspended = false

  // Resizing keeps the scroll offset in pixels while the slides change width,
  // which leaves the viewport between two slides. Browsers do not reliably
  // re-snap: they clamp the offset when the viewport shrinks, and Firefox
  // later scrolls back, smoothly, to a slide it was clamped to. So after a
  // resize the scroll position says nothing about where the user is:
  //
  // - until the observer has seen the new width, `measure` and `settleNow`
  //   ignore the scroll position, which mixes the old offset with new widths;
  // - the observer then puts the active slide back in the centre at once,
  //   before the next paint, and pins it there: any scroll the browser starts
  //   is undone, until the resize has been quiet for a moment or the user
  //   interacts with the carousel.
  const widthOf = () => viewport.getBoundingClientRect().width
  let width = widthOf()
  let pinned = -1
  let pinTimer: ReturnType<typeof setTimeout> | undefined

  /** Puts the pinned slide back in the centre. Returns whether one is pinned. */
  function holdPin() {
    const target = getSlides()[pinned]
    if (!target) return false
    scrollSlideIntoCentre(viewport, target, "instant")
    return true
  }

  function unpin() {
    if (pinned === -1) return
    pinned = -1
    clearTimeout(pinTimer)
    settleNow()
  }

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => {
          if (widthOf() === width) return
          width = widthOf()
          pinned = activeIndex
          clearTimeout(pinTimer)
          pinTimer = setTimeout(unpin, RESIZE_QUIET)
          holdPin()
        })
  resizeObserver?.observe(viewport)
  const resizePending = () =>
    resizeObserver !== undefined && widthOf() !== width

  // Anything the user does to the carousel ends the pin at once.
  const interactions = ["pointerdown", "wheel", "keydown", "touchstart"]
  for (const type of interactions) {
    viewport.addEventListener(type, unpin, { passive: true })
  }

  function measure() {
    frame = 0
    if (resizePending() || pinned !== -1) return
    const index = findNearestSlide(viewport, getSlides())
    if (index !== -1 && index !== activeIndex) {
      activeIndex = index
      onActiveChange(index)
    }
  }

  function settleNow() {
    cancelAnimationFrame(frame)
    clearTimeout(settleTimer)
    if (resizePending() || pinned !== -1) return
    measure()
    if (!suspended && activeIndex !== settledIndex) {
      settledIndex = activeIndex
      onSettle(activeIndex)
    }
  }

  let lastScroll = 0

  // Without `scrollend`, a pause in scroll events may be a stalled smooth
  // scroll or a finger resting mid-swipe. Settle only once a slide is centred,
  // or after a longer quiet period, in case snapping is turned off.
  function settleWhenAligned() {
    const slides = getSlides()
    const nearest = slides[findNearestSlide(viewport, slides)]
    const quiet = performance.now() - lastScroll
    if (nearest && !isCentred(viewport, nearest) && quiet < settleDelay * 5) {
      settleTimer = setTimeout(settleWhenAligned, settleDelay)
      return
    }
    settleNow()
  }

  function handleScroll() {
    if (pinned !== -1 && holdPin()) return
    if (!frame) frame = requestAnimationFrame(measure)
    if (!useScrollEnd) {
      lastScroll = performance.now()
      clearTimeout(settleTimer)
      settleTimer = setTimeout(settleWhenAligned, settleDelay)
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
      unpin()
      const slides = getSlides()
      const target = slides[Math.min(Math.max(index, 0), slides.length - 1)]
      if (!target) return false
      return scrollSlideIntoCentre(viewport, target, behavior)
    },
    update: settleNow,
    suspend() {
      suspended = true
    },
    resume() {
      suspended = false
      settleNow()
    },
    destroy() {
      cancelAnimationFrame(frame)
      clearTimeout(settleTimer)
      viewport.removeEventListener("scroll", handleScroll)
      viewport.removeEventListener("scrollend", settleNow)
      for (const type of interactions) {
        viewport.removeEventListener(type, unpin)
      }
      clearTimeout(pinTimer)
      resizeObserver?.disconnect()
    },
  }
}
