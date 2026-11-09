/**
 * Mouse dragging for scroll containers.
 *
 * Browsers scroll a scroll container with touch, a trackpad, a wheel or the
 * keyboard, but not by dragging it with a mouse. This adds that, for mouse
 * pointers only: touch and pens keep the browser's native scrolling.
 *
 * - `createMouseDrag` drags the slide viewport: snapping is off while
 *   dragging, and on release it lands on the slide nearest the centre, or on
 *   the next one after a quick flick.
 * - `createMouseScroll` drags a freely scrolling container, such as the
 *   thumbnail strip, along one axis.
 *
 * Both turn a press into a drag only after a few pixels, so clicks keep
 * working, and swallow the click that ends a drag.
 */

import {
  findNearestSlide,
  horizontalCentre,
  isCentred,
  scrollSlideIntoCentre,
} from "./geometry"

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

type Axis = "x" | "y"

interface DragHandlers {
  /** A press has turned into a drag. */
  onStart(): void
  /** The pointer moved `distance` pixels along the axis since the press. */
  onMove(distance: number): void
  /** The drag ended, with the pointer's speed along the axis in px/ms. */
  onEnd(speed: number): void
}

/**
 * Turns mouse presses on `element` into drags along `axis`, and reports
 * them to `handlers`. Sets `data-dragging` while dragging.
 */
function trackMouseDrag(
  element: HTMLElement,
  axis: Axis,
  handlers: DragHandlers
): () => void {
  let press: { pointerId: number; position: number } | null = null
  let dragging = false
  let samples: { position: number; time: number }[] = []

  const positionOf = (event: PointerEvent) =>
    axis === "x" ? event.clientX : event.clientY

  /** The pointer's speed over the last moments; positive is right or down. */
  function speedAt(time: number) {
    const recent = samples.filter(
      (sample) => time - sample.time <= SPEED_WINDOW
    )
    const first = recent[0]
    const last = recent[recent.length - 1]
    if (!first || !last || last.time === first.time) return 0
    return (last.position - first.position) / (last.time - first.time)
  }

  function swallowClick(event: Event) {
    event.preventDefault()
    event.stopPropagation()
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0) return
    press = { pointerId: event.pointerId, position: positionOf(event) }
    samples = [{ position: positionOf(event), time: event.timeStamp }]
  }

  function handlePointerMove(event: PointerEvent) {
    if (!press || event.pointerId !== press.pointerId) return
    const distance = positionOf(event) - press.position
    if (!dragging) {
      if (Math.abs(distance) < DRAG_THRESHOLD) return
      dragging = true
      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        // Synthetic events have no active pointer to capture.
      }
      element.setAttribute("data-dragging", "")
      getSelection()?.removeAllRanges()
      handlers.onStart()
    }
    samples.push({ position: positionOf(event), time: event.timeStamp })
    handlers.onMove(distance)
  }

  function handlePointerUp(event: PointerEvent) {
    if (!press || event.pointerId !== press.pointerId) return
    press = null
    if (!dragging) return
    dragging = false
    samples.push({ position: positionOf(event), time: event.timeStamp })
    element.removeAttribute("data-dragging")
    // The click that ends a drag is not a click on what was under the mouse.
    element.addEventListener("click", swallowClick, { capture: true })
    setTimeout(() =>
      element.removeEventListener("click", swallowClick, { capture: true })
    )
    handlers.onEnd(
      event.type === "pointercancel" ? 0 : speedAt(event.timeStamp)
    )
  }

  function preventNativeDrag(event: DragEvent) {
    event.preventDefault()
  }

  element.setAttribute("data-mouse-drag", "")
  element.addEventListener("pointerdown", handlePointerDown)
  element.addEventListener("pointermove", handlePointerMove)
  element.addEventListener("pointerup", handlePointerUp)
  element.addEventListener("pointercancel", handlePointerUp)
  element.addEventListener("dragstart", preventNativeDrag)

  return () => {
    element.removeEventListener("pointerdown", handlePointerDown)
    element.removeEventListener("pointermove", handlePointerMove)
    element.removeEventListener("pointerup", handlePointerUp)
    element.removeEventListener("pointercancel", handlePointerUp)
    element.removeEventListener("dragstart", preventNativeDrag)
    element.removeEventListener("click", swallowClick, { capture: true })
    element.removeAttribute("data-mouse-drag")
    element.removeAttribute("data-dragging")
  }
}

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

/** Lets a mouse drag the slides of a horizontal scroll-snap viewport. */
export function createMouseDrag(
  viewport: HTMLElement,
  options: MouseDragOptions
): MouseDrag {
  const { getSlides, getBehavior, onDragStart, onDragEnd } = options

  // From the first drag until the viewport rests on a slide again.
  let active = false
  let startScroll = 0
  let startIndex = -1
  let landing: { target: HTMLElement; timer: number } | null = null

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

  /** Lands on the nearest slide, or its neighbour after a flick. */
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
    landing = { target, timer: window.setTimeout(finish, LANDING_TIMEOUT) }
    viewport.addEventListener("scroll", handleLandingScroll, { passive: true })
  }

  const untrack = trackMouseDrag(viewport, "x", {
    onStart() {
      stopLanding()
      if (!active) {
        active = true
        onDragStart?.()
      }
      startScroll = viewport.scrollLeft
      startIndex = findNearestSlide(viewport, getSlides())
      viewport.style.setProperty("scroll-snap-type", "none")
    },
    onMove(distance) {
      viewport.scrollTo({ left: startScroll - distance, behavior: "instant" })
    },
    onEnd: land,
  })

  return {
    destroy() {
      untrack()
      finish()
    },
  }
}

/**
 * Lets a mouse drag a freely scrolling container, such as the thumbnail
 * strip, along `axis`.
 */
export function createMouseScroll(
  container: HTMLElement,
  axis: Axis
): MouseDrag {
  let start = 0
  const untrack = trackMouseDrag(container, axis, {
    onStart() {
      start = axis === "x" ? container.scrollLeft : container.scrollTop
    },
    onMove(distance) {
      container.scrollTo({
        [axis === "x" ? "left" : "top"]: start - distance,
        behavior: "instant",
      })
    },
    onEnd() {},
  })
  return { destroy: untrack }
}
