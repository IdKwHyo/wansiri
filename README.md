# Wansiri Hospital — Gender Affirming Care

Portable copy of the website supplied by the owner:
https://wansiri-gender-affirming-care.karndanai537.chatgpt.site/

The original public HTML, CSS, JavaScript, fonts and images were recovered on September 14, 2026. This is editable static source, with no install or build step, backend, API keys, or dependency on the old ChatGPT account.

## Current version

Includes the Tiffany blue palette, additional subtle Tiffany accents, and the supplied surgeon portrait. Exported from the current private preview on September 23, 2026.

Source revision: `abdd290cf0817296f089701f62d010dcf981a5b5`.

## Preview locally

From this folder:

```bash
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. On Windows, use `py` instead of `python3` if needed. Use an HTTP server rather than double-clicking index.html because the site uses JavaScript modules.

## Update your existing GitHub repository

Copy the contents of this extracted folder into your existing `wansiri` repository folder, replacing matching files. Do not create another nested `wansiri-website` folder inside the repository. Then run from your repository folder:

```bash
git add .
git commit -m "Update Tiffany styling and surgeon portrait"
git push origin main
```

## Push to a new GitHub repository

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
| `dist/assets/` | Site images, the supplied surgeon portrait, and both font styles |
| `dist/vendor/` | Local GSAP, ScrollTrigger, Lenis and Three.js dependencies |

Keep the `dist` folder tracked: it contains the editable website, not generated build output.

## Fidelity and provenance

The original layout, page copy, hospital contact details, clinical-photo disclosure, animations, mobile navigation and reduced-motion behavior are preserved. Requested updates add the Tiffany blue palette and accents, replace the visible surgeon portrait with the supplied photo, and adapt its responsive crop. The portable source also uses relative asset URLs and omits the old host's injected Cloudflare challenge bootstrap.

`source-manifest.json` records the original recovery and downloaded file hashes; it predates the Tiffany and portrait updates. This package recovers the published website; it does not claim to recover the other account's private repository or development history. The original `noindex,nofollow` metadata is preserved. If search-engine indexing is wanted, change that tag in `dist/index.html`.

Original asset ownership and embedded third-party license notices remain unchanged. This package does not assign a new license to the hospital materials or vendor code.
