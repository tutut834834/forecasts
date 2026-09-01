# DAX 40 One-Day Forecast Study v4

## Why the previous version did not store anything

The old page literally contained:

`SUBMIT_ENDPOINT = "REPLACE_WITH_YOUR_WORKER_URL"`

That is only a placeholder. A static GitHub Pages page cannot secretly authenticate to GitHub and create repository files by itself. If a GitHub token were put directly into `index.html`, every visitor could steal it.

This version therefore uses one Cloudflare Worker for BOTH:
1. obtaining the historical series for all 40 anonymous DAX stocks; and
2. securely writing the final 120 forecasts into your GitHub repository.

## Experimental design

Current DAX-40 universe used here (August 2026 composition), but company identities are not returned to the browser.

For each of 40 stocks:
- last 5 completed closes -> touch/click one next-day forecast point
- last 10 completed closes -> touch/click one next-day forecast point
- last 20 completed closes -> touch/click one next-day forecast point

Total: 40 × 3 = 120 forecasts per participant.

The historical cutoff is frozen at **2026-08-31**, so the study does not drift from day to day.

## Setup — do these steps once

### A. GitHub Pages frontend
Put these in the root of your public Pages repository:
- `index.html`
- `config.js`

Enable: Settings -> Pages -> Deploy from branch -> main -> /(root)

### B. GitHub token
Create a fine-grained personal access token restricted to the result repository.
Permission:
- Repository permissions -> Contents -> Read and write

Do NOT put this token in `index.html`, `config.js`, or a public GitHub repo.

### C. Cloudflare Worker
Create a Worker and paste `worker.js`.

Add Worker secrets/variables:
- `GITHUB_TOKEN` = the fine-grained token
- `GITHUB_OWNER` = your GitHub username / organization
- `GITHUB_REPO` = repository where result files should be created
- `ALLOWED_ORIGIN` = your Pages origin, for example `https://yourname.github.io`

Deploy.

### D. Connect the frontend
Copy the Worker URL, e.g.
`https://dax-forecast-submit.example.workers.dev`

Open `config.js` and replace:
`REPLACE_WITH_YOUR_WORKER_URL`

with the Worker URL.

Commit/push `config.js`.

### E. Test it
Open the GitHub Page and press **Test backend**.

You need to see:
`✓ Backend connected. Repository submission can work.`

Then the page loads all 40 historical series.

## Submission storage

A completed participant creates one unique file:

`forecasts/forecast_<timestamp>_<anonymous-id>.txt`

Each file contains all 120 forecasts.

Unique filenames are intentional: using one literal `forecast user.txt` would cause participants to overwrite one another.

## Historical data

The Worker requests daily German-listed `.DE` historical series and takes exactly the latest 20 completed observations at or before the frozen cutoff 2026-08-31. The browser receives only `Stock 1` ... `Stock 40` and their numerical series.

For a formal study, independently validate the frozen data once after the first `/data` request and keep the cached/frozen result unchanged.
