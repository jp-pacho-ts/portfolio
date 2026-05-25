# JP Pacho — Portfolio

Personal portfolio site for JP Pacho, a full-stack developer based in Tacloban City, Philippines. Built with React, Three.js, and Vite.

**Live site:** https://jp-pacho-ts.github.io/portfolio/

---

## Tech Stack

| Layer | Tools |
|---|---|
| Framework | React 19, Vite 8 |
| 3D / Canvas | Three.js 0.184 |
| Icons | Lucide React |
| Styling | Plain CSS with CSS custom properties |
| Deployment | GitHub Actions → GitHub Pages |

---

## Features

- Perspective grid Three.js background — vanishing-point floor with scrolling lines, depth-fade shader, and mouse-driven camera pan
- Split-curtain page loader — top and bottom panels slide apart to reveal the page
- Dark / light mode with animated theme toggle and clip-path wipe transition
- Ambient particle field that brightens near the cursor
- Fully responsive layout

---

## Local Development

```bash
npm install
npm run dev
```

```bash
npm run build    # production build → ./dist
npm run preview  # preview the production build locally
```

---

## Project Structure

```
src/
  App.jsx   — UI, Three.js background, loader, theme logic
  App.css   — all styles and responsive breakpoints
  data.js   — projects and tech stack content
.github/
  workflows/
    deploy.yml  — build and deploy to GitHub Pages on push to main
```

---

## Deployment

Pushes to `main` trigger the GitHub Actions workflow automatically. The site is served from the `./dist` build artifact via GitHub Pages.

To set up on a new repo:

1. Create a GitHub repo named `portfolio`
2. Push to `main`
3. Go to **Settings → Pages → Source → GitHub Actions**
