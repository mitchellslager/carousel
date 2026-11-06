/**
 * Every text the carousel puts in the accessibility tree. Pass a partial
 * object to `Carousel.Root`'s `labels` prop to translate or reword them.
 * Indexes are zero-based.
 */
export interface CarouselLabels {
  /** `aria-roledescription` of the root. */
  carousel: string
  /** `aria-roledescription` of each slide. */
  slide: string
  /** `aria-label` of each slide. */
  slideLabel: (index: number, total: number) => string
  /** `aria-label` of `Carousel.Prev`. */
  previous: string
  /** `aria-label` of `Carousel.Next`. */
  next: string
  /** `aria-label` of the thumbnail tab list. */
  thumbnails: string
  /** `aria-label` of each thumbnail tab. */
  thumbnailLabel: (index: number, total: number) => string
  /** Announced by the live region when the carousel settles on a slide. */
  announcement: (index: number, total: number) => string
}

export const defaultLabels: CarouselLabels = {
  carousel: "carousel",
  slide: "slide",
  slideLabel: (index, total) => `${index + 1} of ${total}`,
  previous: "Previous slide",
  next: "Next slide",
  thumbnails: "Slides",
  thumbnailLabel: (index) => `Slide ${index + 1}`,
  announcement: (index, total) => `Slide ${index + 1} of ${total}`,
}
