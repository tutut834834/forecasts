# Touch Forecast Study v3

Changes in this version:
- NO number-entry boxes.
- The participant forecasts by touching/clicking a point in the shaded right-hand forecast zone.
- One-day-ahead forecast only.
- Three views per stock: last 5, 10, and 20 trading observations.
- Four anonymous stocks = 12 forecasts per participant.
- Forecasts can be saved to the GitHub repository via `worker.js`.

## GitHub Pages
Upload `index.html` to your repo and enable GitHub Pages.

## Submission backend
A static GitHub Pages site cannot safely contain a GitHub write token. Deploy `worker.js` as a Cloudflare Worker and set:
- GITHUB_TOKEN
- GITHUB_OWNER
- GITHUB_REPO
- ALLOWED_ORIGIN

Then replace:
`REPLACE_WITH_YOUR_WORKER_URL`
inside `index.html`.

Each completed participant creates a unique file in `/forecasts/` rather than overwriting someone else's result.

## Data note
Stocks 1 and 2 use the supplied Deutsche Börse histories.
Stocks 3 and 4 are prototype public-history series assembled for testing the interface. Before a formal study, replace them with one verified, consistent venue/source series if exact Xetra closes are required.
