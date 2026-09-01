// Cloudflare Worker backend.
// Set these Worker secrets/variables:
// GITHUB_TOKEN      = fine-grained GitHub token with Contents: Read and write on the target repo
// GITHUB_OWNER      = your GitHub username/org
// GITHUB_REPO       = your repository name
// ALLOWED_ORIGIN    = e.g. https://YOURNAME.github.io
//
// This safely keeps the GitHub token OFF the public GitHub Pages site.

export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") return new Response("", {headers});
    if (request.method !== "POST") return new Response('{"error":"POST only"}', {status:405,headers});

    try {
      const p = await request.json();
      if (!p || !Array.isArray(p.forecasts) || !p.anonymous_id) {
        return new Response('{"error":"Invalid payload"}', {status:400,headers});
      }

      // Never trust a client-supplied file path.
      const safeId = String(p.anonymous_id).replace(/[^a-zA-Z0-9-]/g,"").slice(0,64);
      const stamp = new Date().toISOString().replace(/[:.]/g,"-");
      const path = `forecasts/forecast_${stamp}_${safeId}.txt`;

      const lines = [
        "Anonymous stock forecast submission",
        `submitted_at: ${p.submitted_at || new Date().toISOString()}`,
        `anonymous_id: ${safeId}`,
        "",
        ...p.forecasts.flatMap(f => [
          `stock_id: ${String(f.stock_id)}`,
          `history_window_days: ${Number(f.history_window_days)}`,
          `last_known_date: ${String(f.last_known_date)}`,
          `last_known_close: ${Number(f.last_known_close).toFixed(2)}`,
          `forecast_next_close: ${Number(f.forecast_next_close).toFixed(2)}`,
          ""
        ])
      ];
      const content = lines.join("\n");
      const api = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
      const gh = await fetch(api, {
        method:"PUT",
        headers:{
          "Authorization":`Bearer ${env.GITHUB_TOKEN}`,
          "Accept":"application/vnd.github+json",
          "X-GitHub-Api-Version":"2022-11-28",
          "User-Agent":"forecast-study-worker",
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          message:`Add anonymous forecast ${safeId}`,
          content:btoa(unescape(encodeURIComponent(content)))
        })
      });
      if (!gh.ok) {
        const detail = await gh.text();
        return new Response(JSON.stringify({error:"GitHub write failed",detail}), {status:502,headers});
      }
      return new Response(JSON.stringify({ok:true,path}), {status:200,headers});
    } catch (e) {
      return new Response(JSON.stringify({error:String(e.message || e)}), {status:500,headers});
    }
  }
};
