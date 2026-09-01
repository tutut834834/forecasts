# Anonymous Stock Forecast Study — GitHub Pages + repository storage

This package implements the revised design:

- one-day-ahead forecast only
- 3 views of each stock: last 5, last 10, last 20 trading days
- no participant name
- participant types a forecast price under each graph
- one final Submit button
- submissions are written into the GitHub repository as unique `.txt` files
- the GitHub token is NOT exposed in the public page

## Important: why there are two files

A GitHub Pages site is static. It cannot safely commit `forecast user.txt` directly to your repository because that would require placing a GitHub token in public JavaScript.

Therefore:

- `index.html` = public GitHub Pages frontend
- `worker.js` = tiny Cloudflare Worker backend containing the GitHub token as a secret

Each participant gets a unique file such as:

`forecasts/forecast_2026-09-01T10-12-00-000Z_<anonymous-id>.txt`

This is better than always writing `forecast user.txt`, because multiple anonymous players would overwrite one another.

## Data currently included

Only Stock 1 and Stock 2 are active because only those two complete time series were supplied in the message:
- Stock 1: Merck KGaA data
- Stock 2: Symrise AG data

The public interface hides company names and only shows `Stock 1` / `Stock 2`.

To add stocks 3–40, add their closing-price arrays to the `stocks` array in `index.html`. Do not invent missing price histories.

## 1. Put the frontend on GitHub Pages

1. Create a repository.
2. Upload `index.html`.
3. Settings → Pages → Deploy from a branch.
4. Select `main` and `/ (root)`.

## 2. Create a fine-grained GitHub token

Create a fine-grained personal access token restricted to this repository with:
- Repository permissions → Contents → Read and write

Never paste the token into `index.html`.

## 3. Create the Cloudflare Worker

1. Create a Cloudflare Worker.
2. Paste `worker.js`.
3. Add secrets / variables:
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER`
   - `GITHUB_REPO`
   - `ALLOWED_ORIGIN` = your GitHub Pages origin, e.g. `https://yourname.github.io`
4. Deploy the Worker.
5. Copy its URL.

## 4. Connect the page

In `index.html`, change:

`const SUBMIT_ENDPOINT = "REPLACE_WITH_YOUR_WORKER_URL";`

to your Worker URL, for example:

`const SUBMIT_ENDPOINT = "https://forecast-submit.yourname.workers.dev";`

Commit the change.

## Result

When a player completes all forecasts and clicks Submit, the Worker creates a new anonymous text file under `/forecasts/` in your repository.
