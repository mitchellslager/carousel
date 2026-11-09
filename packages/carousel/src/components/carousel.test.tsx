import "../styles.css"

import { afterEach, describe, expect, it, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import { Carousel } from "../index"
import type { RootProps } from "./root"

const WIDTH = 300

interface GalleryProps extends Partial<RootProps> {
  count?: number
  thumbnails?: "horizontal" | "vertical" | false
  controls?: boolean
}

function Gallery({
  count = 5,
  thumbnails = false,
  controls = true,
  ...rootProps
}: GalleryProps) {
  const indexes = Array.from({ length: count }, (_, i) => i)
  return (
    <Carousel.Root
      aria-label="Product images"
      style={{ width: WIDTH }}
      {...rootProps}
    >
      <Carousel.Viewport data-testid="viewport">
        {indexes.map((i) => (
          <Carousel.Slide key={i} style={{ height: 100 }}>
            <a href={`#slide-${i}`}>Link {i + 1}</a>
          </Carousel.Slide>
        ))}
      </Carousel.Viewport>
      {controls && (
        <>
          <Carousel.Prev>Prev</Carousel.Prev>
          <Carousel.Next>Next</Carousel.Next>
          <Carousel.Counter data-testid="counter" />
        </>
      )}
      {thumbnails && (
        <Carousel.Thumbnails
          orientation={thumbnails}
          data-testid="thumbnails"
          style={thumbnails === "horizontal" ? { width: 100 } : { height: 100 }}
        >
          {indexes.map((i) => (
            <Carousel.Thumbnail
              key={i}
              index={i}
              style={{ width: 40, height: 40 }}
            >
              {i + 1}
            </Carousel.Thumbnail>
          ))}
        </Carousel.Thumbnails>
      )}
    </Carousel.Root>
  )
}

const viewport = () => page.getByTestId("viewport").element() as HTMLElement
const slides = () =>
  [...viewport().querySelectorAll("[data-carousel-slide]")] as HTMLElement[]
const counter = () => page.getByTestId("counter")
const liveRegion = () =>
  document.querySelector("[aria-live=polite]") as HTMLElement
const tab = (n: number) => page.getByRole("tab", { name: `Slide ${n}` })
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Moves the scroll position directly, as a swipe does. A swipe is direct
 * manipulation, so it ignores the stylesheet's `scroll-behavior: smooth`.
 */
function swipeTo(index: number) {
  const element = viewport()
  const sign = getComputedStyle(element).direction === "rtl" ? -1 : 1
  element.scrollTo({ left: sign * index * WIDTH, behavior: "instant" })
}

afterEach(() => {
  document.dir = "ltr"
})

describe("structure and ARIA", () => {
  it("renders the basic carousel pattern without thumbnails", async () => {
    await render(<Gallery />)

    const region = page.getByRole("region", { name: "Product images" })
    await expect
      .element(region)
      .toHaveAttribute("aria-roledescription", "carousel")

    const groups = page.getByRole("group")
    await expect.poll(() => groups.elements().length).toBe(5)
    await expect
      .element(groups.first())
      .toHaveAttribute("aria-roledescription", "slide")
    await expect.element(groups.first()).toHaveAccessibleName("1 of 5")
    await expect.element(page.getByRole("tablist")).not.toBeInTheDocument()
  })

  it("makes slides that are not active inert", async () => {
    await render(<Gallery />)

    await expect
      .poll(() => slides().map((slide) => slide.inert))
      .toEqual([false, true, true, true, true])
    expect(slides()[0]).toHaveAttribute("data-active")
  })

  it("renders the tabbed pattern with thumbnails", async () => {
    await render(<Gallery thumbnails="horizontal" />)

    const tablist = page.getByRole("tablist", { name: "Slides" })
    await expect
      .element(tablist)
      .toHaveAttribute("aria-orientation", "horizontal")
    await expect
      .poll(() => page.getByRole("tabpanel").elements().length)
      .toBe(5)

    const first = page.getByRole("tab", { name: "Slide 1" })
    await expect.element(first).toHaveAttribute("aria-selected", "true")
    await expect.element(first).toHaveAttribute("tabindex", "0")
    await expect
      .element(page.getByRole("tab", { name: "Slide 2" }))
      .toHaveAttribute("tabindex", "-1")
    await expect
      .poll(() => first.element().getAttribute("aria-controls"))
      .toBe(slides()[0]!.id)
  })

  it("translates labels", async () => {
    await render(
      <Gallery
        labels={{
          carousel: "carrousel",
          slideLabel: (index, total) => `${index + 1} van ${total}`,
          next: "Volgende",
        }}
      />
    )

    await expect
      .element(page.getByRole("region"))
      .toHaveAttribute("aria-roledescription", "carrousel")
    await expect
      .element(page.getByRole("group").first())
      .toHaveAccessibleName("1 van 5")
    await expect
      .element(page.getByRole("button", { name: "Volgende" }))
      .toBeInTheDocument()
    // Untouched labels keep their default.
    await expect
      .element(page.getByRole("button", { name: "Previous slide" }))
      .toBeInTheDocument()
  })
})

describe("navigation", () => {
  it("moves with Next and Prev, and updates the counter", async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    await render(<Gallery onIndexChange={onIndexChange} />)
    await expect.element(counter()).toHaveTextContent("1 / 5")

    await page.getByRole("button", { name: "Next slide" }).click()

    await expect.element(counter()).toHaveTextContent("2 / 5")
    await expect.poll(() => onIndexChange.mock.calls).toEqual([[1]])

    await page.getByRole("button", { name: "Previous slide" }).click()

    await expect.element(counter()).toHaveTextContent("1 / 5")
    await expect.poll(() => onIndexChange.mock.calls).toEqual([[1], [0]])
  })

  it("disables Prev at the start and Next at the end", async () => {
    await render(<Gallery count={2} />)
    const prev = page.getByRole("button", { name: "Previous slide" })
    const next = page.getByRole("button", { name: "Next slide" })

    await expect.element(prev).toHaveAttribute("aria-disabled", "true")
    await expect.element(next).not.toHaveAttribute("aria-disabled")

    await next.click()

    await expect.element(next).toHaveAttribute("aria-disabled", "true")
    await expect.element(next).toHaveAttribute("data-disabled")
    await expect.element(prev).not.toHaveAttribute("aria-disabled")
  })

  it("follows a swipe and settles once", async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    await render(<Gallery onIndexChange={onIndexChange} />)

    swipeTo(3)

    await expect.element(counter()).toHaveTextContent("4 / 5")
    await expect.poll(() => onIndexChange.mock.calls).toEqual([[3]])
    await expect.poll(() => slides()[3]!.inert).toBe(false)
  })

  it("starts on defaultIndex without reporting a change", async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    await render(<Gallery defaultIndex={3} onIndexChange={onIndexChange} />)

    await expect.element(counter()).toHaveTextContent("4 / 5")
    await expect.poll(() => slides()[3]!.hasAttribute("data-active")).toBe(true)
    await sleep(200)
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it("scrolls when the controlled index changes, and lets a swipe win", async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    const screen = await render(
      <Gallery index={0} onIndexChange={onIndexChange} />
    )

    await screen.rerender(<Gallery index={2} onIndexChange={onIndexChange} />)

    await expect.element(counter()).toHaveTextContent("3 / 5")
    await expect.poll(() => onIndexChange.mock.calls).toEqual([[2]])

    // The parent keeps index={2}, but the swipe still wins.
    swipeTo(4)

    await expect.element(counter()).toHaveTextContent("5 / 5")
    await expect.poll(() => onIndexChange.mock.lastCall).toEqual([4])
  })

  it("keeps the active slide aligned when the viewport resizes", async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    await render(<Gallery onIndexChange={onIndexChange} />)
    swipeTo(2)
    await expect.poll(() => onIndexChange.mock.calls).toEqual([[2]])

    const root = viewport().closest<HTMLElement>("[data-carousel-root]")!
    for (const width of [200, 450, 260]) {
      root.style.width = `${width}px`
      await expect.poll(() => viewport().scrollLeft).toBe(2 * width)
    }

    await expect.element(counter()).toHaveTextContent("3 / 5")
    await sleep(200)
    expect(onIndexChange.mock.calls).toEqual([[2]])
  })

  it("clamps when slides are removed", async () => {
    const screen = await render(<Gallery defaultIndex={4} />)
    await expect.element(counter()).toHaveTextContent("5 / 5")

    await screen.rerender(<Gallery defaultIndex={4} count={3} />)

    await expect.element(counter()).toHaveTextContent("3 / 3")
  })

  it("jumps instead of scrolling smoothly with reduced motion", async () => {
    await render(<Gallery motion="reduce" />)
    await expect.element(counter()).toHaveTextContent("1 / 5")

    await page.getByRole("button", { name: "Next slide" }).click()

    // An instant scroll has moved by the time the click returns.
    expect(viewport().scrollLeft).toBe(WIDTH)
  })
})

describe("thumbnails", () => {
  it("selects a slide by clicking its thumbnail", async () => {
    const onIndexChange = vi.fn<(index: number) => void>()
    await render(
      <Gallery thumbnails="horizontal" onIndexChange={onIndexChange} />
    )

    await page.getByRole("tab", { name: "Slide 3" }).click()

    await expect.element(counter()).toHaveTextContent("3 / 5")
    await expect
      .element(page.getByRole("tab", { name: "Slide 3" }))
      .toHaveAttribute("aria-selected", "true")
    await expect.poll(() => onIndexChange.mock.calls).toEqual([[2]])
  })

  it("centres the active thumbnail in the strip", async () => {
    await render(<Gallery thumbnails="horizontal" />)

    swipeTo(2)

    await expect.element(tab(3)).toHaveAttribute("aria-selected", "true")
    // Thumbnails are 40px wide in a 100px strip: the third one's centre is
    // at 100px, so the strip scrolls 50px to centre it.
    const strip = page.getByTestId("thumbnails").element() as HTMLElement
    await expect.poll(() => strip.scrollLeft).toBe(50)
  })

  it("starts with the active thumbnail centred, without animating", async () => {
    await render(<Gallery thumbnails="horizontal" defaultIndex={2} />)

    await expect.element(counter()).toHaveTextContent("3 / 5")
    const strip = page.getByTestId("thumbnails").element() as HTMLElement
    expect(strip.scrollLeft).toBe(50)
  })

  it("follows the carousel and keeps the active thumbnail in view", async () => {
    await render(<Gallery thumbnails="horizontal" />)

    swipeTo(4)

    const last = page.getByRole("tab", { name: "Slide 5" })
    await expect.element(last).toHaveAttribute("aria-selected", "true")
    await expect.element(last).toHaveAttribute("tabindex", "0")
    const strip = page.getByTestId("thumbnails").element() as HTMLElement
    await expect.poll(() => strip.scrollLeft).toBeGreaterThan(0)
    expect(window.scrollY).toBe(0)
  })

  it("moves with arrow keys, Home and End", async () => {
    await render(<Gallery thumbnails="horizontal" />)

    await tab(1).click()
    await userEvent.keyboard("{ArrowRight}")

    await expect.element(tab(2)).toHaveFocus()
    await expect.element(tab(2)).toHaveAttribute("aria-selected", "true")

    await userEvent.keyboard("{End}")
    await expect.element(tab(5)).toHaveFocus()
    await expect.element(counter()).toHaveTextContent("5 / 5")

    await userEvent.keyboard("{ArrowRight}")
    await expect.element(tab(1)).toHaveFocus()

    await userEvent.keyboard("{ArrowLeft}")
    await expect.element(tab(5)).toHaveFocus()

    await userEvent.keyboard("{Home}")
    await expect.element(tab(1)).toHaveFocus()
  })

  it("uses up and down for vertical thumbnails", async () => {
    await render(<Gallery thumbnails="vertical" />)

    await tab(1).click()
    await userEvent.keyboard("{ArrowDown}")
    await expect.element(tab(2)).toHaveFocus()

    await userEvent.keyboard("{ArrowUp}")
    await expect.element(tab(1)).toHaveFocus()
  })

  it("reverses horizontal arrow keys in right-to-left layouts", async () => {
    document.dir = "rtl"
    await render(<Gallery thumbnails="horizontal" />)

    await tab(1).click()
    await userEvent.keyboard("{ArrowLeft}")

    await expect.element(tab(2)).toHaveFocus()
    await expect.element(counter()).toHaveTextContent("2 / 5")
  })
})

describe("live region", () => {
  it("announces a change from Next", async () => {
    await render(<Gallery />)

    await page.getByRole("button", { name: "Next slide" }).click()

    await expect.poll(() => liveRegion().textContent).toBe("Slide 2 of 5")
  })

  it("does not announce a change from a thumbnail tab", async () => {
    await render(<Gallery thumbnails="horizontal" />)

    await page.getByRole("tab", { name: "Slide 3" }).click()

    await expect.element(counter()).toHaveTextContent("3 / 5")
    await sleep(200)
    expect(liveRegion().textContent).toBe("")
  })

  it("hides the counter from assistive technology", async () => {
    await render(<Gallery />)
    await expect.element(counter()).toHaveAttribute("aria-hidden", "true")
  })
})

describe("render prop", () => {
  it("renders a control as the given element with merged props", async () => {
    const onClick = vi.fn<() => void>()
    await render(
      <Carousel.Root aria-label="Images" style={{ width: WIDTH }}>
        <Carousel.Viewport data-testid="viewport">
          <Carousel.Slide style={{ height: 100 }}>One</Carousel.Slide>
          <Carousel.Slide style={{ height: 100 }}>Two</Carousel.Slide>
        </Carousel.Viewport>
        <Carousel.Next
          className="from-part"
          // The part supplies the accessible name through aria-label.
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label
          render={<button className="from-render" onClick={onClick} />}
        >
          Next
        </Carousel.Next>
        <Carousel.Counter data-testid="counter" />
      </Carousel.Root>
    )
    const next = page.getByRole("button", { name: "Next slide" })

    await expect.element(next).toHaveClass("from-part", "from-render")
    await next.click()

    expect(onClick).toHaveBeenCalledOnce()
    await expect.element(counter()).toHaveTextContent("2 / 2")
  })

  it("throws a clear error outside Root", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(render(<Carousel.Next />)).rejects.toThrow(
      "Carousel.Next must be rendered inside Carousel.Root."
    )
  })
})
