# Wansiri Hospital — Gender Affirming Care

Portable copy of the website supplied by the owner:
https://wansiri-gender-affirming-care.karndanai537.chatgpt.site/

The original public HTML, CSS, JavaScript, fonts and images were recovered on September 14, 2026. This is editable static source, with no install or build step, backend, API keys, or dependency on the old ChatGPT account.

## Preview locally

From this folder:

```bash
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. On Windows, use `py` instead of `python3` if needed. Use an HTTP server rather than double-clicking index.html because the site uses JavaScript modules.

## Push to GitHub

Create an empty repository, open a terminal in this extracted folder, and run:

```bash
git init
git add .
git commit -m "Add Wansiri website"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your repository's HTTPS URL. The ZIP contains no Git history, account credentials or ChatGPT project identity.

## Host on Vercel

Import your GitHub repository. Select **Other** as the framework if asked. The included `vercel.json` sets `dist` as the output directory and skips installation and building. No environment variables are required.

Reference: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build) and [vercel.json settings](https://vercel.com/docs/project-configuration/vercel-json).

## Host on GitHub Pages

1. Push this folder to your repository, including `.github/workflows/pages.yml`.
2. In repository **Settings → Pages**, choose **GitHub Actions** as the source.
3. In **Actions**, select **Deploy static site to Pages** and run the workflow.

The workflow publishes `dist`. It is manual so importing the repository alone does not trigger publication. Run it again after changes. Relative asset paths support both repository subpaths and custom domains.

Reference: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Edit the site

| File | Purpose |
| --- | --- |
| `dist/index.html` | Page copy, sections, clinical gallery, contact links |
| `dist/editorial.css` | Layout, colors, fonts and responsive styles |
| `dist/app.js` | Navigation, disclosures, smooth scrolling and animation |
| `dist/fabric-depth.js` | Original Three.js fabric scene |
| `dist/fabric-fallback.js` | Original canvas fallback |
| `dist/assets/` | Original images and both font styles |
| `dist/vendor/` | Local GSAP, ScrollTrigger, Lenis and Three.js dependencies |

Keep the `dist` folder tracked: it contains the editable website, not generated build output.

## Fidelity and provenance

All visible content and styling, including the hospital contact details, clinical-photo disclosure, animations, mobile navigation and reduced-motion behavior, are preserved. The only application-file adjustments are relative asset URLs and removal of the old host's injected Cloudflare challenge bootstrap, which is not part of the website's design or functionality.

`source-manifest.json` records the original downloaded file hashes and these changes. This package recovers the published website; it does not claim to recover the other account's private repository or development history. The original `noindex,nofollow` metadata is preserved. If search-engine indexing is wanted, change that tag in `dist/index.html`.

Original asset ownership and embedded third-party license notices remain unchanged. This package does not assign a new license to the hospital materials or vendor code.
