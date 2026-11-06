import { afterEach, describe, expect, it } from "vitest"

import { scrollIntoViewWithin } from "./geometry"

function createStrip(direction: "row" | "column") {
  const strip = document.createElement("div")
  Object.assign(strip.style, {
    display: "flex",
    flexDirection: direction,
    overflow: "auto",
    width: direction === "row" ? "100px" : "40px",
    height: direction === "row" ? "40px" : "100px",
  })
  for (let i = 0; i < 10; i++) {
    const item = document.createElement("div")
    Object.assign(item.style, { flex: "none", width: "40px", height: "40px" })
    strip.append(item)
  }
  // Push the strip below the fold, so scrolling the page would be noticed.
  const spacer = document.createElement("div")
  spacer.style.height = "200vh"
  document.body.append(spacer, strip)
  const items = [...strip.children] as HTMLElement[]
  return { strip, items }
}

function isFullyVisible(container: HTMLElement, element: HTMLElement) {
  const outer = container.getBoundingClientRect()
  const inner = element.getBoundingClientRect()
  return (
    inner.left >= outer.left - 1 &&
    inner.right <= outer.right + 1 &&
    inner.top >= outer.top - 1 &&
    inner.bottom <= outer.bottom + 1
  )
}

afterEach(() => {
  document.body.replaceChildren()
  window.scrollTo(0, 0)
})

describe("scrollIntoViewWithin", () => {
  it("scrolls a horizontal strip, not the page", () => {
    const { strip, items } = createStrip("row")
    const last = items[9]!

    scrollIntoViewWithin(strip, last, "instant")

    expect(isFullyVisible(strip, last)).toBe(true)
    expect(window.scrollY).toBe(0)
  })

  it("scrolls a vertical strip", () => {
    const { strip, items } = createStrip("column")
    const last = items[9]!

    scrollIntoViewWithin(strip, last, "instant")

    expect(isFullyVisible(strip, last)).toBe(true)
  })

  it("scrolls back to an item before the visible part", () => {
    const { strip, items } = createStrip("row")
    strip.scrollLeft = 400

    scrollIntoViewWithin(strip, items[0]!, "instant")

    expect(strip.scrollLeft).toBe(0)
  })

  it("leaves a visible item alone", () => {
    const { strip, items } = createStrip("row")

    scrollIntoViewWithin(strip, items[1]!, "instant")

    expect(strip.scrollLeft).toBe(0)
  })
})
