# @mitchellslager/carousel

[![npm](https://img.shields.io/npm/v/%40mitchellslager%2Fcarousel)](https://www.npmjs.com/package/@mitchellslager/carousel)
[![CI](https://github.com/mitchellslager/carousel/actions/workflows/ci.yml/badge.svg)](https://github.com/mitchellslager/carousel/actions/workflows/ci.yml)
[![Bundle size](https://deno.bundlejs.com/badge?q=@mitchellslager/carousel&config=%7B%22esbuild%22%3A%7B%22external%22%3A%5B%22react%22%2C%22react-dom%22%2C%22react%2Fjsx-runtime%22%5D%7D%7D)](https://bundlejs.com/?q=@mitchellslager/carousel&config=%7B%22esbuild%22%3A%7B%22external%22%3A%5B%22react%22%2C%22react-dom%22%2C%22react%2Fjsx-runtime%22%5D%7D%7D)
[![License](https://img.shields.io/npm/l/%40mitchellslager%2Fcarousel)](https://github.com/mitchellslager/carousel/blob/main/LICENSE)

A headless, accessible image carousel for React 19, driven by native CSS scroll snapping.

- **Usage:** [packages/carousel/README.md](packages/carousel/README.md), also shown on [npm](https://www.npmjs.com/package/@mitchellslager/carousel)
- **Demo:** [mitchellslager.github.io/carousel](https://mitchellslager.github.io/carousel/)
- **Design decisions:** [DESIGN.md](DESIGN.md)

## Development

The library lives in `packages/carousel`, the demo in `apps/demo`.

```bash
pnpm install
pnpm dev
```

See [AGENTS.md](AGENTS.md) for conventions and the checks a change must pass.

## License

MIT
