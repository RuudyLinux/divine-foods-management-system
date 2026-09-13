<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/dffa8003-9224-4275-814c-912320200f39

## Quick Start (Windows One-Click)

- **To Start:** Double-click [`start.bat`](start.bat) or run `start.bat` in your terminal.
  - Automatically installs dependencies (`npm install`) if missing.
  - Automatically avoids port conflicts (defaults to port 3000, or chooses port 3030 if port 3000 is used by another project).
  - Automatically opens the web application in your default browser.
  - You can optionally specify a custom port: `start.bat 3000`.

- **To Stop:** Double-click [`stop.bat`](stop.bat) or run `stop.bat` in your terminal.
  - Gracefully terminates the dev server window and all associated Vite/node processes for this project without affecting other running projects.

## Manual Commands

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Type check / lint:
   ```bash
   npm run lint
   ```
