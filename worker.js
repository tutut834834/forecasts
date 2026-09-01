// Cloudflare Worker - Token hardcoded
// GITHUB_OWNER = tutut834834
// GITHUB_REPO = forecasts
// ALLOWED_ORIGIN = https://tutut834834.github.io

function H(env){
 return {
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json"
 }
}

export default {
 async fetch(req, env){
  const h = H(env);
  if (req.method === "OPTIONS") return new Response("", {headers: h});
  const u = new URL(req.url);
  if (req.method !== "POST" || u.pathname !== "/submit") {
   return new Response(JSON.stringify({error: "POST /submit only"}), {status: 404, headers: h});
  }
  try {
   const p = await req.json();
   if (!Array.isArray(p.forecasts) || p.forecasts.length !== 6) throw new Error("Expected 6 forecasts");
   const id = String(p.anonymous_id || crypto.randomUUID()).replace(/[^a-zA-Z0-9-]/g, "");
   const stamp = new Date().toISOString().replace(/[:.]/g, "-");
   const path = `forecast_${stamp}_${id}.txt`;
   const lines = [
    "Anonymous one-day forecast test",
    `submitted_at: ${p.submitted_at}`,
    `cutoff_date: ${p.cutoff_date}`,
    `anonymous_id: ${id}`,
    "number_of_forecasts: 6",
    ""
   ];
   for (const f of p.forecasts) {
    lines.push(
     `stock_id: ${f.stock_id}`,
     `history_window_days: ${f.history_window_days}`,
     `last_known_date: ${f.last_known_date}`,
     `last_known_close: ${Number(f.last_known_close).toFixed(2)}`,
     `forecast_next_close: ${Number(f.forecast_next_close).toFixed(2)}`,
     ""
    );
   }
   const bytes = new TextEncoder().encode(lines.join("\n"));
   let bin = "";
   for (const b of bytes) bin += String.fromCharCode(b);
   
   // HARDCODED TOKEN
   const token = "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";
   const owner = "tutut834834";
   const repo = "forecasts";
   
   const api = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
   const gh = await fetch(api, {
    method: "PUT",
    headers: {
     "Authorization": `Bearer ${token}`,
     "Accept": "application/vnd.github+json",
     "X-GitHub-Api-Version": "2022-11-28",
     "User-Agent": "forecast-study",
     "Content-Type": "application/json"
    },
    body: JSON.stringify({
     message: `Add forecast ${id}`,
     content: btoa(bin),
     branch: "main"
    })
   });
   if (!gh.ok) throw new Error(`GitHub ${gh.status}: ${await gh.text()}`);
   return new Response(JSON.stringify({ok: true, path}), {headers: h});
  } catch(e) {
   return new Response(JSON.stringify({error: String(e.message || e)}), {status: 500, headers: h});
  }
 }
};
