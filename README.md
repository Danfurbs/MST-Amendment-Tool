# MST Amendment Tool

Static client for viewing and editing MST calendars. The site is now prepared for GitHub Pages deployment by serving all public assets from the `docs/` directory.

## GitHub Pages

1. In the repository settings, enable GitHub Pages and select the `work` branch (or default branch) with `/docs` as the source directory.
2. Publish the site and access it at the URL provided by GitHub Pages (usually `https://<user>.github.io/<repo>/`).
3. Open `docs/index.html` locally if you prefer to run the app without GitHub Pages.

## Project layout

- `docs/index.html` – main entry point for the MST Amendment calendar UI.
- `docs/libs/` – JavaScript and CSS dependencies bundled for offline use.
- `docs/.nojekyll` – ensures GitHub Pages serves the static assets without Jekyll processing.
- `MSTs.xlsx` – example dataset for local testing (not served by GitHub Pages).
- `MST Download SQL.txt` – SQL query used to generate MST data.
