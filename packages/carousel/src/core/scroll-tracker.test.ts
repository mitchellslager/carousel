import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createScrollTracker,
  findNearestSlide,
  type ScrollTracker,
  type ScrollTrackerOptions,
} from "./scroll-tracker"

const SLIDE_WIDTH = 300

function createViewport({
  count = 5,
  dir = "ltr",
}: { count?: number; dir?: "ltr" | "rtl" } = {}) {
  const viewport = document.createElement("div")
  viewport.dir = dir
  Object.assign(viewport.style, {
    display: "flex",
    width: `${SLIDE_WIDTH}px`,
    height: "100px",
    overflowX: "auto",
    scrollSnapType: "x mandatory",
  })
  for (let i = 0; i < count; i++) {
    const slide = document.createElement("div")
    slide.textContent = `Slide ${i + 1}`
    Object.assign(slide.style, { flex: "0 0 100%", scrollSnapAlign: "center" })
    viewport.append(slide)
  }
  document.body.append(viewport)
  const getSlides = () => [...viewport.children] as HTMLElement[]
  return { viewport, getSlides }
}

/** Horizontal distance between the centres of a slide and the viewport. */
function offCentre(viewport: HTMLElement, slide: HTMLElement) {
  const v = viewport.getBoundingClientRect()
  const s = slide.getBoundingClientRect()
  return Math.abs(s.left + s.width / 2 - (v.left + v.width / 2))
}

/** Scrolls as a user would, by moving the scroll position directly. */
function userScrollTo(viewport: HTMLElement, index: number) {
  const sign = getComputedStyle(viewport).direction === "rtl" ? -1 : 1
  viewport.scrollLeft = sign * index * SLIDE_WIDTH
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let current: ScrollTracker | undefined

function track(
  viewport: HTMLElement,
  options: Omit<ScrollTrackerOptions, "onActiveChange" | "onSettle"> &
    Partial<Pick<ScrollTrackerOptions, "onActiveChange" | "onSettle">>
) {
  const onActiveChange = vi.fn<(index: number) => void>()
  const onSettle = vi.fn<(index: number) => void>()
  current = createScrollTracker(viewport, {
    onActiveChange,
    onSettle,
    ...options,
  })
  return { tracker: current, onActiveChange, onSettle }
}

afterEach(() => {
  current?.destroy()
  current = undefined
  document.body.replaceChildren()
})

describe("findNearestSlide", () => {
  it("returns the slide nearest the viewport centre", () => {
    const { viewport, getSlides } = createViewport()
    expect(findNearestSlide(viewport, getSlides())).toBe(0)

    userScrollTo(viewport, 2)
    expect(findNearestSlide(viewport, getSlides())).toBe(2)
  })

  it("works in right-to-left layouts", () => {
    const { viewport, getSlides } = createViewport({ dir: "rtl" })
    userScrollTo(viewport, 3)
    expect(findNearestSlide(viewport, getSlides())).toBe(3)
  })

  it("returns -1 without slides", () => {
    const { viewport } = createViewport({ count: 0 })
    expect(findNearestSlide(viewport, [])).toBe(-1)
  })
})

describe("createScrollTracker", () => {
  it("reads the initial position without calling back", () => {
    const { viewport, getSlides } = createViewport()
    userScrollTo(viewport, 1)
    const { tracker, onActiveChange, onSettle } = track(viewport, {
      getSlides,
    })

    expect(tracker.activeIndex).toBe(1)
    expect(tracker.settledIndex).toBe(1)
    expect(onActiveChange).not.toHaveBeenCalled()
    expect(onSettle).not.toHaveBeenCalled()
  })

  it("follows a user scroll and settles once", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onActiveChange, onSettle } = track(viewport, {
      getSlides,
    })

    userScrollTo(viewport, 2)

    await expect.poll(() => onSettle.mock.calls).toEqual([[2]])
    expect(onActiveChange).toHaveBeenLastCalledWith(2)
    expect(tracker.activeIndex).toBe(2)
    expect(tracker.settledIndex).toBe(2)
  })

  it("settles only on the final slide of a smooth scroll", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onActiveChange, onSettle } = track(viewport, {
      getSlides,
    })

    tracker.scrollToIndex(3, "smooth")

    await expect.poll(() => onSettle.mock.calls).toEqual([[3]])
    expect(onActiveChange).toHaveBeenLastCalledWith(3)
    await sleep(200)
    expect(onSettle).toHaveBeenCalledTimes(1)
  })

  it("centres the requested slide", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onSettle } = track(viewport, { getSlides })

    expect(tracker.scrollToIndex(2, "instant")).toBe(true)

    await expect.poll(() => onSettle.mock.calls).toEqual([[2]])
    expect(offCentre(viewport, getSlides()[2]!)).toBeLessThan(1)
  })

  it("centres the requested slide in right-to-left layouts", async () => {
    const { viewport, getSlides } = createViewport({ dir: "rtl" })
    const { tracker, onSettle } = track(viewport, { getSlides })

    tracker.scrollToIndex(2, "instant")

    await expect.poll(() => onSettle.mock.calls).toEqual([[2]])
    expect(offCentre(viewport, getSlides()[2]!)).toBeLessThan(1)
  })

  it("clamps out-of-range indexes", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onSettle } = track(viewport, { getSlides })

    tracker.scrollToIndex(99, "instant")
    await expect.poll(() => onSettle.mock.lastCall).toEqual([4])

    tracker.scrollToIndex(-5, "instant")
    await expect.poll(() => onSettle.mock.lastCall).toEqual([0])
  })

  it("does nothing when already on the requested slide", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onActiveChange, onSettle } = track(viewport, {
      getSlides,
    })

    expect(tracker.scrollToIndex(0, "instant")).toBe(false)

    await sleep(200)
    expect(onActiveChange).not.toHaveBeenCalled()
    expect(onSettle).not.toHaveBeenCalled()
  })

  it("clamps to the last slide when slides are removed", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onSettle } = track(viewport, { getSlides })
    tracker.scrollToIndex(4, "instant")
    await expect.poll(() => onSettle.mock.lastCall).toEqual([4])

    getSlides()[4]!.remove()
    getSlides()[3]!.remove()
    tracker.update()

    await expect.poll(() => onSettle.mock.lastCall).toEqual([2])
    expect(tracker.activeIndex).toBe(2)
  })

  it("settles through the debounce fallback", async () => {
    const { viewport, getSlides } = createViewport()
    const { onSettle } = track(viewport, {
      getSlides,
      settle: "debounce",
      settleDelay: 50,
    })

    userScrollTo(viewport, 1)

    await expect.poll(() => onSettle.mock.calls).toEqual([[1]])
  })

  it("waits while the debounce fallback rests between slides", async () => {
    const { viewport, getSlides } = createViewport()
    // Without snapping, the position can rest between two slides, like a
    // finger holding a swipe halfway.
    viewport.style.scrollSnapType = "none"
    const { onSettle } = track(viewport, {
      getSlides,
      settle: "debounce",
      settleDelay: 50,
    })

    viewport.scrollLeft = 1.4 * SLIDE_WIDTH

    await sleep(120)
    expect(onSettle).not.toHaveBeenCalled()
    // It still settles eventually, so turning snapping off never hangs it.
    await expect.poll(() => onSettle.mock.calls).toEqual([[1]])
  })

  it("stops listening after destroy", async () => {
    const { viewport, getSlides } = createViewport()
    const { tracker, onActiveChange, onSettle } = track(viewport, {
      getSlides,
    })

    tracker.destroy()
    userScrollTo(viewport, 2)

    await sleep(200)
    expect(onActiveChange).not.toHaveBeenCalled()
    expect(onSettle).not.toHaveBeenCalled()
  })
})
