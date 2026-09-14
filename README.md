# Wansiri Hospital — Gender Affirming Care

Responsive editorial patient guide with expandable reading panels, a procedure comparison table, clinical gallery, and scroll-controlled ambient visuals.

## Host the website

The deployable website is already in **`dist/`**. It is static HTML, CSS, JavaScript, fonts and images; it needs no application server, database, environment variables or API keys.

Configure your static hosting service with:

| Setting | Value |
| --- | --- |
| Framework | None / static HTML |
| Build command | Leave blank |
| Publish / output directory | `dist` |
| Entry point | `dist/index.html` |

Serve `dist/` at the root of your domain. Asset paths start with `/`, so a subdirectory such as `example.com/wansiri-care/` requires updating those paths. Merely uploading the repository to GitHub does not enable website hosting.

The `.openai/hosting.json` file belongs to the existing ChatGPT Sites deployment. It is not needed by another hosting provider and should not be copied into the public web root.

## Local development

Use Node.js 22.12+ or Node.js 24.

```sh
npm ci
npm run dev
```

Vite serves the existing `dist/` source files directly. Edit `dist/index.html`, `dist/editorial.css`, and `dist/app.js`. No build step is required. `/?review=mobile` is a development-only 390px iframe for responsive inspection; it is not part of the hosted static files.

## Motion and accessibility

- One Lenis instance uses the GSAP ticker; touch scrolling remains native.
- Three.js supplies a global decorative scene. Canvas 2D renders the same projected geometry if a WebGL context cannot be created.
- Reduced-motion and reduced-transparency preferences are respected.
- Expandable sections work without JavaScript. The clinical gallery opens separately from the bulk reading control.
- All assets and dependencies are self-hosted. There are no analytics, forms or medical-data collection endpoints.

## Content and assets

Hospital-supplied photographs and the surgeon profile are under `dist/assets/`. Dependency licenses and provenance are retained under `dist/vendor/` and `dist/assets/fonts/`.

The current page is a client-review version with `noindex,nofollow`. Medical review is not claimed; clinical copy, service availability, patient-image publication permission and final notices need hospital signoff before public release. Detailed editorial and validation notes are in `REVIEW.md`.
