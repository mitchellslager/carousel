---
"@mitchellslager/carousel": patch
---

Keep the active slide in place when the window resizes in large steps, for example from a phone width to a desktop width. The carousel could end up on another slide, or between two, because browsers clamp and re-snap the scroll position on their own.
