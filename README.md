# AUTO-SUBMIT VERSION

Participants do NOT type a GitHub token.

Files for GitHub Pages:
- index.html
- config.js

Backend:
- deploy worker.js as a Cloudflare Worker
- add secrets:
  GITHUB_TOKEN
  GITHUB_OWNER=tutut834834
  GITHUB_REPO=forecasts
  ALLOWED_ORIGIN=https://tutut834834.github.io

Then copy the Worker URL into config.js ONCE.

After that:
visitor opens page -> makes 6 forecasts -> Submit -> txt appears in GitHub.
No token field is shown to visitors.
