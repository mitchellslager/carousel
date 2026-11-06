/**
 * Scroll geometry helpers. Everything is measured with
 * `getBoundingClientRect` and moved with `scrollBy`, which both use physical
 * coordinates, so the same code works for left-to-right and right-to-left
 * layouts.
 */

/** Differences below one pixel are rounding, not a position to move to. */
const TOLERANCE = 1

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
  viewport.scrollBy({ left: delta, behavior })
  return true
}

function overflow(start: number, end: number, min: number, max: number) {
  if (start < min - TOLERANCE) return start - min
  if (end > max + TOLERANCE) return end - max
  return 0
}

/**
 * Scrolls `container` the least amount needed to show `element` completely,
 * like `scrollIntoView({ block: "nearest", inline: "nearest" })`, but without
 * scrolling any ancestor or the page.
 */
export function scrollIntoViewWithin(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior
): void {
  const outer = container.getBoundingClientRect()
  const inner = element.getBoundingClientRect()
  const left = overflow(inner.left, inner.right, outer.left, outer.right)
  const top = overflow(inner.top, inner.bottom, outer.top, outer.bottom)
  if (left || top) container.scrollBy({ left, top, behavior })
}
