import { afterEach, describe, expect, it } from "vitest"

import { scrollIntoCentreWithin } from "./geometry"

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

function centreOffset(container: HTMLElement, element: HTMLElement) {
  const outer = container.getBoundingClientRect()
  const inner = element.getBoundingClientRect()
  return {
    x: inner.left + inner.width / 2 - (outer.left + outer.width / 2),
    y: inner.top + inner.height / 2 - (outer.top + outer.height / 2),
  }
}

afterEach(() => {
  document.body.replaceChildren()
  window.scrollTo(0, 0)
})

describe("scrollIntoCentreWithin", () => {
  it("centres an item in a horizontal strip, not the page", () => {
    const { strip, items } = createStrip("row")

    scrollIntoCentreWithin(strip, items[5]!, "instant")

    expect(Math.abs(centreOffset(strip, items[5]!).x)).toBeLessThan(1)
    expect(window.scrollY).toBe(0)
  })

  it("centres an item in a vertical strip", () => {
    const { strip, items } = createStrip("column")

    scrollIntoCentreWithin(strip, items[5]!, "instant")

    expect(Math.abs(centreOffset(strip, items[5]!).y)).toBeLessThan(1)
  })

  it("centres an item before the visible part", () => {
    const { strip, items } = createStrip("row")
    strip.scrollLeft = 300

    scrollIntoCentreWithin(strip, items[3]!, "instant")

    expect(Math.abs(centreOffset(strip, items[3]!).x)).toBeLessThan(1)
  })

  it("stops at the start and end when an item cannot be centred", () => {
    const { strip, items } = createStrip("row")
    strip.scrollLeft = 200

    scrollIntoCentreWithin(strip, items[0]!, "instant")
    expect(strip.scrollLeft).toBe(0)

    scrollIntoCentreWithin(strip, items[9]!, "instant")
    expect(strip.scrollLeft).toBe(strip.scrollWidth - strip.clientWidth)
  })
})
