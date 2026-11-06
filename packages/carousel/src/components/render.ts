import {
  cloneElement,
  createElement,
  isValidElement,
  useMemo,
  type CSSProperties,
  type ReactElement,
  type Ref,
  type RefCallback,
} from "react"

type Props = Record<string, unknown>

/**
 * Lets a part render as another element, Base UI style:
 * `<Carousel.Next render={<MyButton />} />`. The element's own props are
 * merged with the part's props.
 */
export type RenderProp = ReactElement<Props>

/** Combines refs into one callback ref. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (value) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") return ref(value)
      if (ref) ref.current = value
      return undefined
    })
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index]
        if (typeof cleanup === "function") cleanup()
        else if (typeof ref === "function") ref(null)
        else if (ref) ref.current = null
      })
    }
  }
}

/**
 * `mergeRefs` with a stable identity, so React does not detach and reattach
 * the ref on every render.
 */
export function useMergedRefs<T>(
  a: Ref<T> | undefined,
  b: Ref<T> | undefined
): RefCallback<T> {
  return useMemo(() => mergeRefs(a, b), [a, b])
}

function isHandler(
  key: string,
  value: unknown
): value is (event: unknown) => void {
  return /^on[A-Z]/.test(key) && typeof value === "function"
}

/**
 * Merges `outer` props (from the consumer) over `inner` props (from the
 * part). Class names are joined, styles merged and refs combined. For event
 * handlers, the consumer's runs first; calling `event.preventDefault()` in it
 * skips the part's own handler.
 */
export function mergeProps(inner: Props, outer: Props): Props {
  const merged: Props = { ...inner }
  for (const [key, value] of Object.entries(outer)) {
    const base = inner[key]
    if (value === undefined) continue
    if (key === "className" && base) {
      merged[key] = `${String(base)} ${String(value)}`
    } else if (key === "style" && base) {
      merged[key] = { ...(base as CSSProperties), ...(value as CSSProperties) }
    } else if (key === "ref" && base) {
      merged[key] = mergeRefs(base as Ref<unknown>, value as Ref<unknown>)
    } else if (isHandler(key, value) && isHandler(key, base)) {
      merged[key] = (event: { defaultPrevented?: boolean }) => {
        value(event)
        if (!event?.defaultPrevented) base(event)
      }
    } else {
      merged[key] = value
    }
  }
  return merged
}

/**
 * Renders a part: `tag` with the merged props, or the `render` element with
 * the merged props applied to it.
 */
export function renderPart(
  tag: string,
  props: Props,
  render: RenderProp | undefined
): ReactElement {
  if (isValidElement<Props>(render)) {
    return cloneElement(render, mergeProps(props, render.props))
  }
  return createElement(tag, props)
}
