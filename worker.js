// DAX 40 Forecast Worker
// Deploy this as a Cloudflare Worker.
// Secrets / variables required:
//   GITHUB_TOKEN   fine-grained token: target repo, Contents = Read and write
//   GITHUB_OWNER   GitHub username/org
//   GITHUB_REPO    repository name
//   ALLOWED_ORIGIN exact GitHub Pages origin, e.g. https://username.github.io
//
// This Worker does TWO jobs:
// 1) GET /data  -> downloads historical closes server-side and returns anonymous Stock 1..40 series.
// 2) POST /submit -> writes each participant's 120 forecasts as a unique text file into /forecasts.
//
// Historical experiment cutoff is frozen at 2026-08-31.

const CUTOFF = "2026-08-31";
const ASSETS = [{"id":"s1","ticker":"ADS.DE","name":"adidas"},{"id":"s2","ticker":"AIR.DE","name":"Airbus"},{"id":"s3","ticker":"ALV.DE","name":"Allianz"},{"id":"s4","ticker":"BAS.DE","name":"BASF"},{"id":"s5","ticker":"BAYN.DE","name":"Bayer"},{"id":"s6","ticker":"BEI.DE","name":"Beiersdorf"},{"id":"s7","ticker":"BMW.DE","name":"BMW"},{"id":"s8","ticker":"BNR.DE","name":"Brenntag"},{"id":"s9","ticker":"CBK.DE","name":"Commerzbank"},{"id":"s10","ticker":"CON.DE","name":"Continental"},{"id":"s11","ticker":"DTG.DE","name":"Daimler Truck"},{"id":"s12","ticker":"DBK.DE","name":"Deutsche Bank"},{"id":"s13","ticker":"DB1.DE","name":"Deutsche Boerse"},{"id":"s14","ticker":"DHL.DE","name":"DHL Group"},{"id":"s15","ticker":"DTE.DE","name":"Deutsche Telekom"},{"id":"s16","ticker":"EOAN.DE","name":"E.ON"},{"id":"s17","ticker":"FME.DE","name":"Fresenius Medical Care"},{"id":"s18","ticker":"FRE.DE","name":"Fresenius"},{"id":"s19","ticker":"G1A.DE","name":"GEA Group"},{"id":"s20","ticker":"HNR1.DE","name":"Hannover Rueck"},{"id":"s21","ticker":"HEI.DE","name":"Heidelberg Materials"},{"id":"s22","ticker":"HEN3.DE","name":"Henkel Vz"},{"id":"s23","ticker":"HOT.DE","name":"HOCHTIEF"},{"id":"s24","ticker":"IFX.DE","name":"Infineon"},{"id":"s25","ticker":"MBG.DE","name":"Mercedes-Benz"},{"id":"s26","ticker":"MRK.DE","name":"Merck KGaA"},{"id":"s27","ticker":"MTX.DE","name":"MTU Aero Engines"},{"id":"s28","ticker":"MUV2.DE","name":"Munich Re"},{"id":"s29","ticker":"QIA.DE","name":"Qiagen"},{"id":"s30","ticker":"RHM.DE","name":"Rheinmetall"},{"id":"s31","ticker":"RWE.DE","name":"RWE"},{"id":"s32","ticker":"SAP.DE","name":"SAP"},{"id":"s33","ticker":"G24.DE","name":"Scout24"},{"id":"s34","ticker":"SHL.DE","name":"Siemens Healthineers"},{"id":"s35","ticker":"SIE.DE","name":"Siemens"},{"id":"s36","ticker":"ENR.DE","name":"Siemens Energy"},{"id":"s37","ticker":"SY1.DE","name":"Symrise"},{"id":"s38","ticker":"VOW3.DE","name":"Volkswagen Vz"},{"id":"s39","ticker":"VNA.DE","name":"Vonovia"},{"id":"s40","ticker":"ZAL.DE","name":"Zalando"}];

function cors(env){
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers":"Content-Type",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Content-Type":"application/json",
    "Cache-Control":"no-store"
  };
}

async function yahooSeries(asset){
  // Fetch enough calendar time to safely obtain 20 exchange trading days.
  const p1 = Math.floor(Date.parse("2026-07-01T00:00:00Z")/1000);
  const p2 = Math.floor(Date.parse("2026-09-02T00:00:00Z")/1000);
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.ticker)}?period1=${p1}&period2=${p2}&interval=1d&events=history&includeAdjustedClose=false`;
  const r = await fetch(u,{headers:{"User-Agent":"Mozilla/5.0"}});
  if(!r.ok) throw new Error(`${asset.ticker}: Yahoo HTTP ${r.status}`);
  const j = await r.json();
  const result=j?.chart?.result?.[0];
  if(!result) throw new Error(`${asset.ticker}: no result`);
  const ts=result.timestamp||[];
  const close=result.indicators?.quote?.[0]?.close||[];
  const rows=[];
  for(let i=0;i<ts.length;i++){
    if(close[i]==null || !Number.isFinite(close[i])) continue;
    const date=new Date(ts[i]*1000).toISOString().slice(0,10);
    if(date<=CUTOFF) rows.push({date,close:Math.round(close[i]*100)/100});
  }
  const last20=rows.slice(-20);
  if(last20.length<20) throw new Error(`${asset.ticker}: only ${last20.length} closes`);
  return {id:asset.id,data:last20};
}

async function getData(){
  // Cache the frozen study dataset at the edge. The experiment cutoff never changes.
  const cache=caches.default;
  const key=new Request("https://forecast-study.invalid/frozen-dax40-2026-08-31-v1");
  const hit=await cache.match(key);
  if(hit) return hit;

  const results=await Promise.allSettled(ASSETS.map(yahooSeries));
  const stocks=[],errors=[];
  results.forEach((r,i)=>{
    if(r.status==="fulfilled") stocks.push(r.value);
    else errors.push({id:ASSETS[i].id,error:String(r.reason?.message||r.reason)});
  });
  stocks.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
  const body=JSON.stringify({cutoff:CUTOFF,stocks,errors});
  const response=new Response(body,{headers:{"Content-Type":"application/json","Cache-Control":"public,max-age=86400"}});
  if(stocks.length===40) await cache.put(key,response.clone());
  return response;
}

async function saveSubmission(p,env){
  if(!p?.anonymous_id || !Array.isArray(p.forecasts)) throw new Error("Invalid submission");
  if(p.forecasts.length!==120) throw new Error(`Expected 120 forecasts, received ${p.forecasts.length}`);

  const id=String(p.anonymous_id).replace(/[^a-zA-Z0-9-]/g,"").slice(0,64);
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const path=`forecasts/forecast_${stamp}_${id}.txt`;

  const lines=[
    "Anonymous DAX 40 one-day forecast submission",
    `submitted_at: ${p.submitted_at || new Date().toISOString()}`,
    `cutoff_date: ${CUTOFF}`,
    `anonymous_id: ${id}`,
    `number_of_forecasts: ${p.forecasts.length}`,
    ""
  ];

  for(const f of p.forecasts){
    lines.push(
      `stock_id: ${String(f.stock_id)}`,
      `history_window_days: ${Number(f.history_window_days)}`,
      `last_known_date: ${String(f.last_known_date)}`,
      `last_known_close: ${Number(f.last_known_close).toFixed(2)}`,
      `forecast_next_close: ${Number(f.forecast_next_close).toFixed(2)}`,
      ""
    );
  }

  const content=lines.join("\n");
  const bytes=new TextEncoder().encode(content);
  let binary=""; for(const b of bytes) binary+=String.fromCharCode(b);
  const encoded=btoa(binary);

  const api=`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const gh=await fetch(api,{
    method:"PUT",
    headers:{
      "Authorization":`Bearer ${env.GITHUB_TOKEN}`,
      "Accept":"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28",
      "User-Agent":"dax40-forecast-worker",
      "Content-Type":"application/json"
    },
    body:JSON.stringify({message:`Add anonymous forecast ${id}`,content:encoded})
  });
  if(!gh.ok) throw new Error(`GitHub write failed (${gh.status}): ${await gh.text()}`);
  return path;
}

export default {
 async fetch(request,env){
   const h=cors(env);
   if(request.method==="OPTIONS") return new Response("",{headers:h});
   const url=new URL(request.url);
   try{
     if(request.method==="GET" && url.pathname==="/health"){
       const missing=["GITHUB_TOKEN","GITHUB_OWNER","GITHUB_REPO"].filter(k=>!env[k]);
       return new Response(JSON.stringify({ok:missing.length===0,missing}),{status:missing.length?500:200,headers:h});
     }
     if(request.method==="GET" && url.pathname==="/data"){
       const r=await getData();
       const body=await r.text();
       return new Response(body,{status:r.status,headers:{...h,"Cache-Control":"public,max-age=86400"}});
     }
     if(request.method==="POST" && url.pathname==="/submit"){
       const p=await request.json();
       const path=await saveSubmission(p,env);
       return new Response(JSON.stringify({ok:true,path}),{headers:h});
     }
     return new Response(JSON.stringify({error:"Use GET /data, GET /health, or POST /submit"}),{status:404,headers:h});
   }catch(e){
     return new Response(JSON.stringify({error:String(e.message||e)}),{status:500,headers:h});
   }
 }
};
