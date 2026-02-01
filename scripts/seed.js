// scripts/seed.js
// Seeds: for each of 4 products → 3–5 items per sentiment (we use 4 each) → total 4*3*4 = 48

const BASE_URL =
  process.argv.includes("--remote")
    ? "https://my-first-worker.paulspecht.workers.dev/feedback"
    : "http://127.0.0.1:8790/feedback";


const products = ["Analytics Engine",
  "D1 Database",
  "Workers AI",
  "KV Namespace"];
const sources = ["github", "discord", "support", "email", "twitter", "forum"];

const themes = {
  "Analytics Engine": ["metrics", "queries", "latency", "sampling", "dashboards"],
  "D1 Database": ["schema", "migrations", "indexes", "queries", "performance"],
  "Workers AI": ["models", "latency", "cost", "accuracy", "prompting"],
  "KV Namespace": ["consistency", "ttl", "replication", "read_latency", "writes"],
};


const samples = {
  positive: [
    "Really solid improvement. Works fast and feels reliable.",
    "Great UX update. Everything is easier to find now.",
    "Docs are clear and the examples finally work.",
    "This saved us time. Setup was straightforward.",
    "Stable and smooth. No issues so far.",
  ],
  neutral: [
    "Works as expected. Nothing special but fine.",
    "Setup was okay, docs are average.",
    "Does the job. Some parts could be clearer.",
    "No strong opinion yet. Still testing.",
    "Seems fine overall. Minor rough edges.",
  ],
  negative: [
    "Confusing setup and docs are outdated.",
    "Bugs keep appearing and error messages are vague.",
    "UX feels unfinished and navigation is annoying.",
    "Login/session handling is flaky and inconsistent.",
    "Payments failed but no clear explanation.",
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
}

async function send(feedback) {
  const r = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(feedback),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`POST failed: ${r.status} ${t}`);
  }
}

(async () => {
  // 4 per sentiment = within your 3–5 requirement
  const PER_SENTIMENT = 4;

  for (const product of products) {
    for (const sentiment of ["positive", "neutral", "negative"]) {
      for (let i = 0; i < PER_SENTIMENT; i++) {
        const text = pick(samples[sentiment]);
        const t = [pick(themes[product]), pick(themes[product])].filter((v, idx, a) => a.indexOf(v) === idx);

        await send({
          id: uniqId(),
          product,
          source: pick(sources),
          text,
          sentiment,              // IMPORTANT: forces balanced sentiment
          themes: t,              // optional, but nice for later UI
          bot_risk: pick(["low", "low", "low", "medium"]), // mostly low
        });
      }
    }
  }

  console.log("✅ Seeded 48 feedback items (4 per sentiment per product).");
})();
