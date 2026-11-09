import { createContext, useContext, type Context } from "react"

import type { CarouselLabels } from "./labels"

/** What a change of slide came from. Only tabs are announced by themselves. */
export type ChangeSource = "tab" | "control"

export interface CarouselContextValue {
  /** The live active index: the slide nearest the viewport centre. */
  activeIndex: number
  /** The index the carousel starts on, before any scroll. */
  initialIndex: number
  /** Slides in DOM order. Empty until mounted, so also during SSR. */
  slides: readonly HTMLElement[]
  /** Whether a `Carousel.Thumbnails` is mounted (tabbed ARIA pattern). */
  hasThumbnails: boolean
  setHasThumbnails: (value: boolean) => void
  setViewport: (element: HTMLElement | null) => void
  /** Scrolls to a slide; the active index follows from the scroll. */
  goTo: (index: number, source: ChangeSource) => void
  /** The scroll behaviour to use, following the motion preference. */
  behavior: ScrollBehavior
  labels: CarouselLabels
  ids: {
    root: string
    viewport: string
    slide: (index: number) => string
    tab: (index: number) => string
  }
}

export const CarouselContext: Context<CarouselContextValue | null> =
  createContext<CarouselContextValue | null>(null)

export function useCarouselContext(part: string): CarouselContextValue {
  const context = useContext(CarouselContext)
  if (!context) {
    throw new Error(`Carousel.${part} must be rendered inside Carousel.Root.`)
  }
  return context
}
