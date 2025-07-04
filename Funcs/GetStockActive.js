const https = require("https");
const http = require("http");
const { URL } = require("url");

const options = {
  method: "GET",
  hostname: "growagarden.gg",
  port: null,
  path: "/api/stock",
  headers: {
    accept: "*/*",
    "content-type": "application/json",
    referer: "https://growagarden.gg/stocks",
    "trpc-accept": "application/json",
    "x-trpc-source": "gag",
  },
};

function fetchStocks() {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks);
          const parsed = JSON.parse(body.toString());
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

function calculateRestockTimes() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function pad(n) {
    return n < 10 ? "0" + n : n;
  }

  function getResetTimes(interval) {
    const timeSinceStartOfDay = now.getTime() - today.getTime();
    const lastReset =
      today.getTime() + Math.floor(timeSinceStartOfDay / interval) * interval;
    const nextReset =
      today.getTime() + Math.ceil(timeSinceStartOfDay / interval) * interval;
    return { lastReset, nextReset };
  }

  function countdownTo(ms) {
    const diff = ms - Date.now();
    const h = pad(Math.floor(diff / 3.6e6));
    const m = pad(Math.floor((diff % 3.6e6) / 6e4));
    const s = pad(Math.floor((diff % 6e4) / 1000));
    return `${h}h ${m}m ${s}s`;
  }

  const eggInterval = 30 * 60 * 1000;
  const gearInterval = 5 * 60 * 1000;

  const eggNextReset = getResetTimes(eggInterval).nextReset;
  const gearNextReset = getResetTimes(gearInterval).nextReset;

  return {
    egg: {
      countdown: countdownTo(eggNextReset),
    },
    seed: {
      countdown: countdownTo(gearNextReset),
    },
  };
}

function filterEggAndSeedStocks(data) {
  const result = {};
  const egg = data["eggStock"];
  const seeds = data["seedsStock"];
  const gears = data["gearStock"];
  const imageData = data["imageData"] || {};

  function getImage(name) {
    return imageData[name] || null;
  }

  if (Array.isArray(egg) && egg.length > 0) {
    result["Egg"] = egg.map((item) => ({
      name: item.name,
      image: getImage(item.name),
    }));
  }

  if (Array.isArray(seeds) && seeds.length > 0) {
    result["Seed"] = seeds.map((item) => ({
      name: item.name,
      image: getImage(item.name),
    }));
  }

  if (Array.isArray(gears) && gears.length > 0) {
    result["Gear"] = gears.map((item) => ({
      name: item.name,
      image: getImage(item.name),
    }));
  }

  return result;
}

// ✅ MAIN API Route
function register(app) {
  app.get("/api/stock/active-summary", async (req, res) => {
    try {
      const data = await fetchStocks();
      const restock = calculateRestockTimes();
      const stocks = filterEggAndSeedStocks(data);

      const summary = [];

      const proxyImage = (url) =>
        url
          ? `http://${
              req.headers.host
            }/api/image-proxy?url=${encodeURIComponent(url)}`
          : null;

      if (stocks.Egg) {
        stocks.Egg.forEach((item) => {
          summary.push({
            name: item.name,
            image: proxyImage(item.image),
            restockTime: restock.egg.countdown,
          });
        });
      }

      if (stocks.Seed) {
        stocks.Seed.forEach((item) => {
          summary.push({
            name: item.name,
            image: proxyImage(item.image),
            restockTime: restock.seed.countdown,
          });
        });
      }

      if (stocks.Gear) {
        stocks.Gear.forEach((item) => {
          summary.push({
            name: item.name,
            image: proxyImage(item.image),
            restockTime: restock.seed.countdown,
          });
        });
      }

      res.json({
        stockActive: summary,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Gagal memuat stok aktif" });
    }
  });
}

// ✅ IMAGE PROXY Handler
function registerImageProxy(app) {
  app.get("/api/image-proxy", (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }

    try {
      const parsedUrl = new URL(imageUrl);
      const client = parsedUrl.protocol === "https:" ? https : http;

      const proxyReq = client.get(imageUrl, (proxyRes) => {
        res.setHeader(
          "Content-Type",
          proxyRes.headers["content-type"] || "image/png"
        );
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (err) => {
        console.error("Proxy error:", err);
        res.status(500).send("Failed to fetch image");
      });
    } catch (err) {
      return res.status(400).send("Invalid URL");
    }
  });
}

module.exports = {
  register,
  registerImageProxy,
};
