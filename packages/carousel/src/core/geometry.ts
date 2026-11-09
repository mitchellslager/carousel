/**
 * Scroll geometry helpers. Everything is measured with
 * `getBoundingClientRect` and moved by a physical offset (`scrollBy`, or
 * `scrollTo` with `scrollLeft + offset`, which is what `scrollBy` does), so
 * the same code works for left-to-right and right-to-left layouts.
 */

/** Differences below one pixel are rounding, not a position to move to. */
const TOLERANCE = 1

export function horizontalCentre(element: Element): number {
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

/** Whether `slide` sits in the centre of `viewport`. */
export function isCentred(viewport: HTMLElement, slide: HTMLElement): boolean {
  const delta = horizontalCentre(slide) - horizontalCentre(viewport)
  return Math.abs(delta) < TOLERANCE
}

/**
 * Scrolls `viewport` horizontally so `slide` sits in its centre. Returns
 * whether it had to scroll.
 */
export function scrollSlideIntoCentre(
  viewport: HTMLElement,
  slide: HTMLElement,
  behavior: ScrollBehavior
): boolean {
  const delta = horizontalCentre(slide) - horizontalCentre(viewport)
  if (Math.abs(delta) < TOLERANCE) return false
  // An absolute target, not scrollBy: if the browser adjusts the scroll
  // position at the same time (re-snapping after a resize), a relative
  // scroll would add to that adjustment instead of replacing it.
  viewport.scrollTo({ left: viewport.scrollLeft + delta, behavior })
  return true
}

/**
 * Scrolls `container` so `element` sits in its centre, on both axes, without
 * scrolling any ancestor or the page. Near the start or end of the container
 * the browser clamps the scroll position, so the element ends up as close to
 * the centre as it can.
 */
export function scrollIntoCentreWithin(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior
): void {
  const outer = container.getBoundingClientRect()
  const inner = element.getBoundingClientRect()
  const left = inner.left + inner.width / 2 - (outer.left + outer.width / 2)
  const top = inner.top + inner.height / 2 - (outer.top + outer.height / 2)
  if (Math.abs(left) < TOLERANCE && Math.abs(top) < TOLERANCE) return
  container.scrollBy({ left, top, behavior })
}
