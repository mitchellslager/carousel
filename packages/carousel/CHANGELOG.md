# @mitchellslager/carousel

## 0.2.0

### Minor Changes

- [#13](https://github.com/mitchellslager/carousel/pull/13) [`83250e5`](https://github.com/mitchellslager/carousel/commit/83250e564d562809a56d992cec2161c971404c40) Thanks [@mitchellslager](https://github.com/mitchellslager)! - Add a `mouseDrag` option to `Root`, so a mouse can drag the slides like a finger swipes them, and drag the thumbnail strip. A quick flick moves on to the next slide, and the click that ends a drag does not select a thumbnail or open a link in a slide.

## 0.1.2

### Patch Changes

- [#9](https://github.com/mitchellslager/carousel/pull/9) [`204dec0`](https://github.com/mitchellslager/carousel/commit/204dec069a0d34720e623d35c96ad94e83f1b3c0) Thanks [@mitchellslager](https://github.com/mitchellslager)! - Keep the active thumbnail in the centre of its strip instead of at its edge, and jump there instantly when the carousel mounts.

- [#9](https://github.com/mitchellslager/carousel/pull/9) [`204dec0`](https://github.com/mitchellslager/carousel/commit/204dec069a0d34720e623d35c96ad94e83f1b3c0) Thanks [@mitchellslager](https://github.com/mitchellslager)! - Keep the active slide aligned when the carousel resizes, for example when the browser window changes size, instead of ending up between two slides.

## 0.1.1

### Patch Changes

- [#6](https://github.com/mitchellslager/carousel/pull/6) [`7952600`](https://github.com/mitchellslager/carousel/commit/79526001e4c7d447a6b8f6cdb3b38e89128e80bc) Thanks [@mitchellslager](https://github.com/mitchellslager)! - Declare every component's return type as `ReactElement`, and link the demo and issue tracker from npm.

## 0.1.0

### Minor Changes

- [#3](https://github.com/mitchellslager/carousel/pull/3) [`7f4c9eb`](https://github.com/mitchellslager/carousel/commit/7f4c9ebdbbc40d2c0c5586df11033a79d8c93c03) Thanks [@mitchellslager](https://github.com/mitchellslager)! - Add the carousel components: `Root`, `Viewport`, `Slide`, `Prev`, `Next`, `Counter`, `Thumbnails` and `Thumbnail`. They cover synchronised thumbnail navigation, a counter, the WAI-ARIA carousel pattern with translatable labels, reduced motion and right-to-left layouts.
