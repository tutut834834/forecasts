export default {
 async fetch(request, env) {
   const headers={
     "Access-Control-Allow-Origin":env.ALLOWED_ORIGIN||"*",
     "Access-Control-Allow-Headers":"Content-Type",
     "Access-Control-Allow-Methods":"POST,OPTIONS",
     "Content-Type":"application/json"
   };
   if(request.method==="OPTIONS")return new Response("",{headers});
   if(request.method!=="POST")return new Response('{"error":"POST only"}',{status:405,headers});
   try{
     const p=await request.json();
     if(!p?.anonymous_id||!Array.isArray(p.forecasts))return new Response('{"error":"invalid"}',{status:400,headers});
     const id=String(p.anonymous_id).replace(/[^a-zA-Z0-9-]/g,"").slice(0,64);
     const stamp=new Date().toISOString().replace(/[:.]/g,"-");
     const path=`forecasts/forecast_${stamp}_${id}.txt`;
     const lines=[
       "Anonymous forecast submission",
       `submitted_at: ${p.submitted_at}`,
       `anonymous_id: ${id}`,"",
       ...p.forecasts.flatMap(f=>[
         `stock_id: ${f.stock_id}`,
         `history_window_days: ${f.history_window_days}`,
         `last_known_date: ${f.last_known_date}`,
         `last_known_close: ${f.last_known_close}`,
         `forecast_next_close: ${f.forecast_next_close}`,
         `currency: ${f.currency}`,""
       ])
     ];
     const bytes=new TextEncoder().encode(lines.join("\n"));
     let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
     const api=`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
     const gh=await fetch(api,{method:"PUT",headers:{
       "Authorization":`Bearer ${env.GITHUB_TOKEN}`,
       "Accept":"application/vnd.github+json",
       "X-GitHub-Api-Version":"2022-11-28",
       "User-Agent":"forecast-study-worker","Content-Type":"application/json"
     },body:JSON.stringify({message:`Add forecast ${id}`,content:btoa(binary)})});
     if(!gh.ok)return new Response(JSON.stringify({error:"GitHub write failed",detail:await gh.text()}),{status:502,headers});
     return new Response(JSON.stringify({ok:true,path}),{headers});
   }catch(e){return new Response(JSON.stringify({error:String(e)}),{status:500,headers})}
 }
};