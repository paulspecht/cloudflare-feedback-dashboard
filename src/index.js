// ===== Config (TOP OF FILE) =====
const PRODUCTS = ["Analytics Engine",
  "D1 Database",
  "Workers AI",
  "KV Namespace",];
const SOURCES = ["github", "discord", "support", "email", "twitter", "forum"];

function clampWindow(w) {
  return ["day", "week", "month"].includes(w) ? w : "week";
}

function windowToSince(window) {
  if (window === "day") return "-1 day";
  if (window === "month") return "-30 day";
  return "-7 day";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlPage() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Feedback Dashboard</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; color:#111; }
    h1 { margin: 0 0 8px; }
    .sub { color:#555; margin-bottom: 18px; }
    .grid { display:grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .card { border:1px solid #ddd; border-radius: 12px; padding: 14px; }
    .k { color:#666; font-size: 13px; margin-bottom: 6px; }
    .v { font-size: 32px; font-weight: 700; }
    .controls { display:flex; gap:10px; align-items:center; flex-wrap: wrap; margin: 10px 0 18px; }
    select, button { border:1px solid #ccc; border-radius: 10px; padding: 8px 10px; background:white; font-size: 14px; }
    button.active { border-color:#111; font-weight:600; }
    .row { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin: 14px 0; }
    .pill { display:inline-flex; gap:8px; align-items:center; border:1px solid #ddd; border-radius: 999px; padding: 6px 10px; margin: 4px 6px 0 0; }
    table { width:100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align:left; padding: 10px 8px; border-bottom:1px solid #eee; vertical-align: top; }
    th { color:#666; font-weight: 600; font-size: 13px; }
    td { font-size: 14px; }
    .muted { color:#666; }
    .nowrap { white-space: nowrap; }
  </style>
</head>
<body>
  <h1>Feedback Dashboard (Prototype)</h1>
  <div class="sub">Data is mock. Pipeline is real: Worker → (AI on deploy) → D1 → Stats/List.</div>

  <div class="grid">
    <div class="card"><div class="k">Total feedback</div><div class="v" id="total">—</div></div>
    <div class="card"><div class="k">Sentiment score</div><div class="v" id="sentScore">—</div></div>
    <div class="card"><div class="k">Reliability score</div><div class="v" id="relScore">—</div></div>
    <div class="card"><div class="k">Window</div><div class="v" id="windowLabel">—</div></div>
  </div>

  <div class="controls">
    <div><strong>Product</strong></div>
    <select id="product"></select>

    <div style="margin-left:10px;"><strong>Window</strong></div>
    <select id="window">
      <option value="day">day</option>
      <option value="week" selected>week</option>
      <option value="month">month</option>
    </select>

    <button data-sent="all" class="active">All</button>
    <button data-sent="positive">Positive</button>
    <button data-sent="neutral">Neutral</button>
    <button data-sent="negative">Negative</button>

    <button id="refresh">Refresh</button>
  </div>

  <div class="row">
    <div class="card">
      <div class="k">Counts by source</div>
      <div id="bySource"></div>
    </div>
    <div class="card">
      <div class="k">Counts by sentiment</div>
      <div id="bySent"></div>
    </div>
  </div>

  <h2 style="margin-top:22px;">Feedback list</h2>
  <table>
    <thead>
      <tr>
        <th class="nowrap">Time</th>
        <th>Product</th>
        <th>Source</th>
        <th>Sentiment</th>
        <th>Bot risk</th>
        <th>Text</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>

<script>
  const PRODUCTS = ${JSON.stringify(PRODUCTS)};
  const state = { product: "all", window: "week", sentiment: "all" };
  const el = (id) => document.getElementById(id);

  function renderPills(targetId, arr, key, valKey="n") {
    const wrap = el(targetId);
    wrap.innerHTML = "";
    (arr || []).forEach(x => {
      const d = document.createElement("div");
      d.className = "pill";
      d.innerHTML = "<span><strong>" + (x[key] ?? "unknown") + "</strong></span>"
                  + "<span class='muted'>" + (x[valKey] ?? 0) + "</span>";
      wrap.appendChild(d);
    });
  }

  function setActiveButtons() {
    document.querySelectorAll("button[data-sent]").forEach(b => {
      b.classList.toggle("active", b.dataset.sent === state.sentiment);
    });
  }

  async function load() {
    el("windowLabel").textContent = state.window;

    // stats
    const qs = new URLSearchParams();
    qs.set("window", state.window);
    if (state.product !== "all") qs.set("product", state.product);

    const stats = await fetch("/stats?" + qs.toString()).then(r => r.json());

    el("total").textContent = stats.total ?? 0;
    el("sentScore").textContent = Number(stats.sentiment_score ?? 0).toFixed(2);
    el("relScore").textContent = Number(stats.reliability_score ?? 0).toFixed(2);

    renderPills("bySource", stats.by_source, "source");
    renderPills("bySent", stats.by_sentiment, "sentiment");

    // list
    const qs2 = new URLSearchParams();
    qs2.set("window", state.window);
    if (state.product !== "all") qs2.set("product", state.product);
    if (state.sentiment !== "all") qs2.set("sentiment", state.sentiment);

    const rows = await fetch("/feedbacks?" + qs2.toString()).then(r => r.json());

    const tb = el("tbody");
    tb.innerHTML = "";
    (rows.items || []).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = \`
        <td class="muted nowrap">\${r.created_at ?? ""}</td>
        <td>\${r.product ?? ""}</td>
        <td>\${r.source ?? ""}</td>
        <td>\${r.sentiment ?? ""}</td>
        <td>\${r.bot_risk ?? ""}</td>
        <td>\${(r.raw_text ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}</td>
      \`;
      tb.appendChild(tr);
    });
  }

  // init dropdown
  const prodSel = el("product");
  prodSel.innerHTML =
    '<option value="all">All</option>' +
    PRODUCTS.map(p => '<option value="'+p+'">'+p+'</option>').join("");

  prodSel.addEventListener("change", () => { state.product = prodSel.value; load(); });

  const winSel = el("window");
  winSel.addEventListener("change", () => { state.window = winSel.value; load(); });

  document.querySelectorAll("button[data-sent]").forEach(b => {
    b.addEventListener("click", () => {
      state.sentiment = b.dataset.sent;
      setActiveButtons();
      load();
    });
  });

  el("refresh").addEventListener("click", load);

  setActiveButtons();
  load();
</script>
</body>
</html>`;
}

// ===== Worker =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // UI
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(htmlPage(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Insert feedback
    if (request.method === "POST" && url.pathname === "/feedback") {
      const body = await request.json();

      const source = body.source || "unknown";
      const text = body.text || "";
      const product =
        body.product && PRODUCTS.includes(body.product) ? body.product : "Unknown";

      // Allow seeding to pass sentiment/themes/bot_risk directly
      let sentiment = body.sentiment || null;
      let themes = body.themes || ["general"];
      let bot_risk = body.bot_risk || "low";

      // Only call AI if sentiment not provided (fast + deterministic seeds)
      if (!sentiment) {
        // Fallback-safe: if AI binding missing locally, default to neutral
        if (env.AI && typeof env.AI.run === "function") {
          const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
            messages: [
              {
                role: "system",
                content:
                  "Return ONLY valid JSON with keys: sentiment (positive|neutral|negative), themes (array of strings), bot_risk (low|medium|high).",
              },
              { role: "user", content: text },
            ],
          });

          sentiment = aiResult?.response?.sentiment ?? "neutral";
          themes = aiResult?.response?.themes ?? ["general"];
          bot_risk = aiResult?.response?.bot_risk ?? "low";
        } else {
          sentiment = "neutral";
          themes = ["general"];
          bot_risk = "low";
        }
      }

      await env.DB.prepare(
        "INSERT INTO feedback (source, product, raw_text, sentiment, themes, bot_risk) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(source, product, text, sentiment, JSON.stringify(themes), bot_risk)
        .run();

      return json({ ok: true, sentiment, themes, bot_risk });
    }

    // Stats
    if (request.method === "GET" && url.pathname === "/stats") {
      const window = clampWindow(url.searchParams.get("window") || "week");
      const product = url.searchParams.get("product") || "all";
      const since = windowToSince(window);

      const where = [];
      const binds = [];

      where.push("created_at >= datetime('now', ?)");
      binds.push(since);

      if (product !== "all") {
        where.push("product = ?");
        binds.push(product);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const totalRes = await env.DB.prepare(
        `SELECT COUNT(*) as n FROM feedback ${whereSql}`
      )
        .bind(...binds)
        .first();

      const bySource = await env.DB.prepare(
        `SELECT source, COUNT(*) as n
         FROM feedback ${whereSql}
         GROUP BY source
         ORDER BY n DESC`
      )
        .bind(...binds)
        .all();

      const bySent = await env.DB.prepare(
        `SELECT sentiment, COUNT(*) as n
         FROM feedback ${whereSql}
         GROUP BY sentiment
         ORDER BY n DESC`
      )
        .bind(...binds)
        .all();

      const byProduct = await env.DB.prepare(
        `SELECT product, COUNT(*) as n
         FROM feedback ${whereSql}
         GROUP BY product
         ORDER BY n DESC`
      )
        .bind(...binds)
        .all();

      const scoreRes = await env.DB.prepare(
        `SELECT AVG(
          CASE sentiment
            WHEN 'positive' THEN 1
            WHEN 'negative' THEN -1
            ELSE 0
          END
        ) as score
        FROM feedback ${whereSql}`
      )
        .bind(...binds)
        .first();

      const relRes = await env.DB.prepare(
        `SELECT AVG(
          CASE bot_risk
            WHEN 'low' THEN 1
            WHEN 'medium' THEN 0.5
            ELSE 0
          END
        ) as rel
        FROM feedback ${whereSql}`
      )
        .bind(...binds)
        .first();

      return json({
        window,
        product,
        total: totalRes?.n ?? 0,
        sentiment_score: Number(scoreRes?.score ?? 0),
        reliability_score: Number(relRes?.rel ?? 0),
        by_source: bySource.results || [],
        by_sentiment: bySent.results || [],
        by_product: byProduct.results || [],
      });
    }

    // Feedback list for UI table
    if (request.method === "GET" && url.pathname === "/feedbacks") {
      const window = clampWindow(url.searchParams.get("window") || "week");
      const product = url.searchParams.get("product") || "all";
      const sentiment = url.searchParams.get("sentiment") || "all";
      const since = windowToSince(window);

      const where = [];
      const binds = [];

      where.push("created_at >= datetime('now', ?)");
      binds.push(since);

      if (product !== "all") {
        where.push("product = ?");
        binds.push(product);
      }

      if (sentiment !== "all") {
        where.push("sentiment = ?");
        binds.push(sentiment);
      }

      const whereSql = `WHERE ${where.join(" AND ")}`;

      const res = await env.DB.prepare(
        `SELECT id, source, product, raw_text, sentiment, bot_risk,
                strftime('%Y-%m-%d %H:%M:%S', created_at) as created_at
         FROM feedback
         ${whereSql}
         ORDER BY datetime(created_at) DESC
         LIMIT 200`
      )
        .bind(...binds)
        .all();

      return json({ items: res.results || [] });
    }

    return new Response("OK");
  },
};
