/**
 * Mouse dragging for a scroll-snap viewport.
 *
 * Browsers scroll a scroll container with touch, a trackpad, a wheel or the
 * keyboard, but not by dragging it with a mouse. This adds that, for mouse
 * pointers only: touch and pens keep the browser's native scrolling.
 *
 * While dragging, snapping is turned off and the viewport follows the
 * pointer. On release it scrolls to the slide nearest the centre, or on to the
 * next one after a quick flick, and turns snapping back on once it rests
 * there. The scroll position stays the source of truth throughout.
 */

import {
  findNearestSlide,
  horizontalCentre,
  isCentred,
  scrollSlideIntoCentre,
} from "./geometry"

export interface MouseDragOptions {
  /** Returns the slides in DOM order. */
  getSlides: () => readonly HTMLElement[]
  /** The scroll behaviour for landing on a slide. Read on release. */
  getBehavior: () => ScrollBehavior
  /** Called when a press turns into a drag. */
  onDragStart?: () => void
  /** Called once the viewport rests on a slide again after a drag. */
  onDragEnd?: () => void
}

export interface MouseDrag {
  destroy(): void
}

/** Pixels a press must move before it counts as a drag, not a click. */
const DRAG_THRESHOLD = 5
/** Pixels per millisecond at release that count as a flick. */
const FLICK_SPEED = 0.4
/** Milliseconds of pointer movement that the release speed is measured over. */
const SPEED_WINDOW = 100
/** Milliseconds without scrolling after which a landing counts as done. */
const LANDING_TIMEOUT = 1000

interface Press {
  pointerId: number
  x: number
  scrollLeft: number
}

export function createMouseDrag(
  viewport: HTMLElement,
  options: MouseDragOptions
): MouseDrag {
  const { getSlides, getBehavior, onDragStart, onDragEnd } = options

  let press: Press | null = null
  let dragging = false
  // From the first drag until the viewport rests on a slide again.
  let active = false
  let startIndex = -1
  let samples: { x: number; time: number }[] = []
  let landing: { target: HTMLElement; timer: number } | null = null

  viewport.setAttribute("data-mouse-drag", "")

  function stopLanding() {
    if (!landing) return
    clearTimeout(landing.timer)
    viewport.removeEventListener("scroll", handleLandingScroll)
    landing = null
  }

  function finish() {
    stopLanding()
    viewport.style.removeProperty("scroll-snap-type")
    if (active) {
      active = false
      onDragEnd?.()
    }
  }

  function handleLandingScroll() {
    if (!landing) return
    if (isCentred(viewport, landing.target)) {
      finish()
      return
    }
    clearTimeout(landing.timer)
    landing.timer = window.setTimeout(finish, LANDING_TIMEOUT)
  }

  function startDrag(pointerId: number) {
    dragging = true
    stopLanding()
    if (!active) {
      active = true
      onDragStart?.()
    }
    startIndex = findNearestSlide(viewport, getSlides())
    try {
      viewport.setPointerCapture(pointerId)
    } catch {
      // Synthetic events have no active pointer to capture.
    }
    viewport.setAttribute("data-dragging", "")
    viewport.style.setProperty("scroll-snap-type", "none")
    getSelection()?.removeAllRanges()
  }

  /** The pointer's speed in px/ms over the last moments; positive is rightwards. */
  function releaseSpeed(time: number) {
    const recent = samples.filter(
      (sample) => time - sample.time <= SPEED_WINDOW
    )
    const first = recent[0]
    const last = recent[recent.length - 1]
    if (!first || !last || last.time === first.time) return 0
    return (last.x - first.x) / (last.time - first.time)
  }

  function land(speed: number) {
    const slides = getSlides()
    let index = findNearestSlide(viewport, slides)
    const start = slides[startIndex]
    if (Math.abs(speed) >= FLICK_SPEED && index === startIndex && start) {
      // Moving the pointer left reveals the slide to the right, and the
      // other way round; compare positions so this holds in RTL too.
      const direction = speed < 0 ? 1 : -1
      const neighbour = [slides[startIndex - 1], slides[startIndex + 1]].find(
        (slide) =>
          slide &&
          Math.sign(horizontalCentre(slide) - horizontalCentre(start)) ===
            direction
      )
      if (neighbour) index = slides.indexOf(neighbour)
    }
    const target = slides[index]
    if (!target || !scrollSlideIntoCentre(viewport, target, getBehavior())) {
      finish()
      return
    }
    landing = {
      target,
      timer: window.setTimeout(finish, LANDING_TIMEOUT),
    }
    viewport.addEventListener("scroll", handleLandingScroll, { passive: true })
  }

  function swallowClick(event: Event) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0) return
    press = {
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: viewport.scrollLeft,
    }
    samples = [{ x: event.clientX, time: event.timeStamp }]
  }

  function handlePointerMove(event: PointerEvent) {
    if (!press || event.pointerId !== press.pointerId) return
    const distance = event.clientX - press.x
    if (!dragging) {
      if (Math.abs(distance) < DRAG_THRESHOLD) return
      startDrag(event.pointerId)
    }
    samples.push({ x: event.clientX, time: event.timeStamp })
    viewport.scrollTo({
      left: press.scrollLeft - distance,
      behavior: "instant",
    })
  }

  function handlePointerUp(event: PointerEvent) {
    if (!press || event.pointerId !== press.pointerId) return
    press = null
    if (!dragging) return
    dragging = false
    samples.push({ x: event.clientX, time: event.timeStamp })
    viewport.removeAttribute("data-dragging")
    // The click that ends a drag is not a click on what was under the mouse.
    viewport.addEventListener("click", swallowClick, { capture: true })
    setTimeout(() =>
      viewport.removeEventListener("click", swallowClick, { capture: true })
    )
    land(event.type === "pointercancel" ? 0 : releaseSpeed(event.timeStamp))
  }

  function preventNativeDrag(event: DragEvent) {
    event.preventDefault()
  }

  viewport.addEventListener("pointerdown", handlePointerDown)
  viewport.addEventListener("pointermove", handlePointerMove)
  viewport.addEventListener("pointerup", handlePointerUp)
  viewport.addEventListener("pointercancel", handlePointerUp)
  viewport.addEventListener("dragstart", preventNativeDrag)

  return {
    destroy() {
      viewport.removeEventListener("pointerdown", handlePointerDown)
      viewport.removeEventListener("pointermove", handlePointerMove)
      viewport.removeEventListener("pointerup", handlePointerUp)
      viewport.removeEventListener("pointercancel", handlePointerUp)
      viewport.removeEventListener("dragstart", preventNativeDrag)
      viewport.removeEventListener("click", swallowClick, { capture: true })
      viewport.removeAttribute("data-mouse-drag")
      viewport.removeAttribute("data-dragging")
      finish()
    },
  }
}
