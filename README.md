# SoloOS

Monorepo for the three variants of SoloOS. They share ~90% of their code (all
`netlify/shared/*` and most functions are identical across variants). Keeping
them side-by-side here means a bug fix or new feature can be applied once and
copied to the other variants, then each deploys independently to its own
Netlify site.

## Variants

| Folder                        | What it is                          | Deploys to |
| ----------------------------- | ----------------------------------- | ---------- |
| [`operations/`](operations/)  | Daily internal ops app (Good Work). Has real backend: `claude.mjs`, `data.mjs`. | your ops Netlify site |
| [`demo/`](demo/)              | Public trial sandbox for prospects. Has `demo.mjs`, `demo-expiry.mjs`; no persistent backend. | demo Netlify site |
| [`your-soloos/`](your-soloos/) | The codebase delivered to buyers via Gumroad ([trysoloos.com](https://trysoloos.com/)). Adds `reset.mjs` + `SoloOS-Owners-Guide.pdf`. | shipped as a zip |

## What differs between variants

Identical everywhere: `netlify/shared/*`, and the digest, ics, notify,
outlook-*, qbo-*, and status functions.

Variant-specific:

- **operations** — `netlify/functions/claude.mjs`, `netlify/functions/data.mjs`, `public/GoodWork-White-transparent.png` logo
- **demo** — `netlify/functions/demo.mjs`, `netlify/functions/demo-expiry.mjs`
- **your-soloos** — `netlify/functions/claude.mjs`, `netlify/functions/data.mjs`, `netlify/functions/reset.mjs`, `SoloOS-Owners-Guide.pdf`

Each variant also has its own `public/index.html`, `public/playbook.html`,
`public/manifest.webmanifest`, and `README.md`.

## Applying a shared fix to all variants

When you fix something in a shared file (e.g. `netlify/shared/digestCore.mjs`),
copy it to the other variants. From the repo root:

```sh
# example: propagate a shared-lib change from operations to the others
cp operations/netlify/shared/digestCore.mjs demo/netlify/shared/digestCore.mjs
cp operations/netlify/shared/digestCore.mjs your-soloos/netlify/shared/digestCore.mjs
```

Review with `git diff` before committing so a variant-specific difference is
never overwritten by accident.

## Local development

Each variant is a Netlify site (`netlify.toml`: `publish = public`, functions in
`netlify/functions`). Dev server is the Netlify CLI. Requires Node.js and
`netlify-cli` (`npm i -g netlify-cli`), then:

```sh
cd operations && netlify dev      # or demo / your-soloos
```

Dev-server configs are also in [`.claude/launch.json`](.claude/launch.json)
(operations :8888, demo :8889, your-soloos :8890).

## Secrets

No secrets are committed. All functions read config from environment variables
(e.g. `ANTHROPIC_API_KEY`), set in each Netlify site's dashboard — never in the
repo. `.env` files are gitignored.

## Shipping a new Gumroad deliverable

After updating `your-soloos/`, zip that folder (excluding `node_modules`) and
re-attach it to the Gumroad product.
