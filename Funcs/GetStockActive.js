const https = require("https");

const options = {
  method: "GET",
  hostname: "growagarden.gg",
  port: null,
  path: "/api/stock",
  headers: {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    priority: "u=1, i",
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
  const timezone = "America/New_York"; // or use Intl.DateTimeFormat().resolvedOptions().timeZone if preferred
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  }

  function timeSince(timestamp) {
    const nowMs = Date.now();
    const diff = nowMs - timestamp;

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  function getResetTimes(interval) {
    const timeSinceStartOfDay = now.getTime() - today.getTime();
    const lastReset =
      today.getTime() + Math.floor(timeSinceStartOfDay / interval) * interval;
    const nextReset =
      today.getTime() + Math.ceil(timeSinceStartOfDay / interval) * interval;
    return { lastReset, nextReset };
  }

  const eggInterval = 30 * 60 * 1000;
  const { lastReset: eggLastReset, nextReset: eggNextReset } =
    getResetTimes(eggInterval);
  const eggCountdownMs = eggNextReset - now.getTime();
  const eggCountdown = `${pad(Math.floor(eggCountdownMs / 3.6e6))}h ${pad(
    Math.floor((eggCountdownMs % 3.6e6) / 6e4)
  )}m ${pad(Math.floor((eggCountdownMs % 6e4) / 1000))}s`;

  const gearInterval = 5 * 60 * 1000;
  const { lastReset: gearLastReset, nextReset: gearNextReset } =
    getResetTimes(gearInterval);
  const gearCountdownMs = gearNextReset - now.getTime();
  const gearCountdown = `${pad(Math.floor(gearCountdownMs / 6e4))}m ${pad(
    Math.floor((gearCountdownMs % 6e4) / 1000)
  )}s`;

  const cosmeticInterval = 4 * 3600 * 1000;
  const { lastReset: cosmeticLastReset, nextReset: cosmeticNextReset } =
    getResetTimes(cosmeticInterval);
  const cosmeticCountdownMs = cosmeticNextReset - now.getTime();
  const cosmeticCountdown = `${pad(
    Math.floor(cosmeticCountdownMs / 3.6e6)
  )}h ${pad(Math.floor((cosmeticCountdownMs % 3.6e6) / 6e4))}m ${pad(
    Math.floor((cosmeticCountdownMs % 6e4) / 1000)
  )}s`;

  const nightInterval = 3600 * 1000;
  const { lastReset: nightLastReset, nextReset: nightNextReset } =
    getResetTimes(nightInterval);
  const nightCountdownMs = nightNextReset - now.getTime();
  const nightCountdown = `${pad(Math.floor(nightCountdownMs / 3.6e6))}h ${pad(
    Math.floor((nightCountdownMs % 3.6e6) / 6e4)
  )}m ${pad(Math.floor((nightCountdownMs % 6e4) / 1000))}s`;

  return {
    egg: {
      timestamp: eggNextReset,
      countdown: eggCountdown,
      LastRestock: formatTime(eggLastReset),
      timeSinceLastRestock: timeSince(eggLastReset),
    },
    gear: {
      timestamp: gearNextReset,
      countdown: gearCountdown,
      LastRestock: formatTime(gearLastReset),
      timeSinceLastRestock: timeSince(gearLastReset),
    },
    seeds: {
      timestamp: gearNextReset,
      countdown: gearCountdown,
      LastRestock: formatTime(gearLastReset),
      timeSinceLastRestock: timeSince(gearLastReset),
    },
    cosmetic: {
      timestamp: cosmeticNextReset,
      countdown: cosmeticCountdown,
      LastRestock: formatTime(cosmeticLastReset),
      timeSinceLastRestock: timeSince(cosmeticLastReset),
    },
    SwarmEvent: {
      timestamp: nightNextReset,
      countdown: nightCountdown,
      LastRestock: formatTime(nightLastReset),
      timeSinceLastRestock: timeSince(nightLastReset),
    },
  };
}

function filterActiveStocks(data) {
  const kategori = [
    { key: "gearStock", label: "Gear" },
    { key: "eggStock", label: "Egg" },
    { key: "seedsStock", label: "Seed" },
    { key: "cosmeticsStock", label: "Cosmetic" },
    { key: "honeyStock", label: "Honey" },
    { key: "nightStock", label: "Night" },
    { key: "easterStock", label: "Easter" },
  ];

  const result = {};

  kategori.forEach((kat) => {
    const stok = data[kat.key];
    if (Array.isArray(stok) && stok.length > 0) {
      result[kat.label] = stok.map((item) => ({
        name: item.name,
        value: item.value,
        image: item.image || null,
      }));
    }
  });

  return result;
}

// Fungsi register route
function register(app) {
  app.get("/api/stock/aktif", async (req, res) => {
    try {
      const data = await fetchStocks();
      const filtered = filterActiveStocks(data);
      res.json(filtered);
    } catch (err) {
      res.status(500).json({ error: "Gagal memuat stok aktif" });
    }
  });
}

module.exports = { register };
