# One-Day Forecast Study

## Files for GitHub Pages:
- index.html
- config.js

## Backend:
Deploy worker.js as a Cloudflare Worker

## Setup:
1. Deploy worker.js to Cloudflare Workers
2. Copy the Worker URL
3. Update config.js with your Worker URL:
   `WORKER_URL: "https://your-worker.workers.dev"`
4. Push all files to your GitHub Pages repo

## How it works:
- Visitor opens page
- Makes 6 forecasts by clicking on charts
- Clicks Submit
- .txt file appears in the forecasts repo automatically

No token is shown to visitors.
