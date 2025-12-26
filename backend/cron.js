require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");
const mongoose = require("mongoose");
const RealTimeData = require("./models/realtimeAQI.model");

// -----------------------------
// MongoDB Connection (once)
// -----------------------------
let isMongoConnected = false;

async function connectMongo() {
  if (isMongoConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isMongoConnected = true;
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

// -----------------------------
// Station mapping
// -----------------------------
const stationNameMap = {
  "aya nagar": "Aya Nagar",
  "alipur": "Alipur",
  "anand vihar": "Anand Vihar",
  "satyawati college": "Ashok Vihar",
  "pooth khurd bawana": "Bawana",
  "burari crossing": "Burari Crossing",
  "crri mathura road": "CRRI Mathura Road",
  "dtu": "DTU",
  "national institute of malaria research": "Dwarka-Sector 8",
  "dr karni singh shooting range": "Dr. Karni Singh Shooting Range",
  "igi airport terminal 3": "IGI Airport (T3)",
  "ito": "ITO",
  "iti jahangirpuri": "Jahangirpuri",
  "jawaharlal nehru stadium": "Jawaharlal Nehru Stadium",
  "mandir marg": "Mandir Marg",
  "major dhyan chand national stadium": "Major Dhyan Chand National Stadium",
  "mundka": "Mundka",
  "najafgarh": "Najafgarh",
  "narela": "Narela",
  "pgdav college": "Nehru Nagar",
  "okhla phase 2": "Okhla Phase-2",
  "patparganj": "Patparganj",
  "punjabi bagh": "Punjabi Bagh",
  "pusa": "Pusa",
  "r k puram": "R K Puram",
  "shaheed sukhdev college": "Rohini",
  "sonia vihar": "Sonia Vihar",
  "sri aurobindo marg": "Sri Aurobindo Marg",
  "vivek vihar": "Vivek Vihar",
  "wazirpur": "Wazirpur",
};

const stationsToFetch = Object.values(stationNameMap);

// -----------------------------
// Helpers
// -----------------------------
function normalizeName(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Prevent overlapping cron runs
let isJobRunning = false;

// -----------------------------
// CRON JOB (Every hour @ minute 5)
// -----------------------------
cron.schedule("5 * * * *", async () => {
  if (isJobRunning) {
    console.log("⏭️ Previous cron still running, skipping...");
    return;
  }

  isJobRunning = true;
  console.log("⏰ Cron started:", new Date().toLocaleString());

  try {
    await connectMongo();

    const apiUrl = `https://api.waqi.info/map/bounds/?latlng=28.35,76.80,29.00,77.50&token=${process.env.WAQI_TOKEN}`;
    const response = await axios.get(apiUrl);

    if (response.data.status !== "ok") {
      console.error("❌ WAQI bounds API failed");
      return;
    }

    const stations = response.data.data || [];
    console.log(`📡 Stations fetched: ${stations.length}`);

    // IST timestamp (hourly)
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const timestamp = istTime.toISOString().replace("T", " ").substring(0, 19);

    for (const station of stations) {
      const uid = station.uid;
      const rawName = station.station?.name || "";
      const normalized = normalizeName(rawName);

      let stationName = null;
      for (const key in stationNameMap) {
        if (normalized.includes(key)) {
          stationName = stationNameMap[key];
          break;
        }
      }

      if (!stationName || !stationsToFetch.includes(stationName)) continue;

      try {
        const detailRes = await axios.get(
          `https://api.waqi.info/feed/@${uid}/?token=${process.env.WAQI_TOKEN}`
        );

        const iaqi = detailRes.data?.data?.iaqi || {};

        await RealTimeData.create({
          station: stationName,
          city: "Delhi",
          timestamp,
          pollutants: {
            PM25: iaqi.pm25?.v ?? null,
            PM10: iaqi.pm10?.v ?? null,
            NO2: iaqi.no2?.v ?? null,
            Ozone: iaqi.o3?.v ?? null,
            CO: iaqi.co?.v ?? null,
            SO2: iaqi.so2?.v ?? null,
            NO: iaqi.no?.v ?? null,
            NOx: iaqi.nox?.v ?? null,
            NH3: iaqi.nh3?.v ?? null,
            Benzene: iaqi.benzene?.v ?? null,
            Toluene: iaqi.toluene?.v ?? null,
            Xylene: iaqi.xylene?.v ?? null,
            EthBenzene: iaqi.ethbenzene?.v ?? null,
            AT: iaqi.at?.v ?? null,
            RH: iaqi.rh?.v ?? null,
            WS: iaqi.ws?.v ?? null,
            WD: iaqi.wd?.v ?? null,
            BP: iaqi.bp?.v ?? null,
          },
        });

        console.log(`✅ Saved: ${stationName}`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`⚠️ Duplicate skipped: ${stationName}`);
        } else {
          console.error(`❌ ${stationName}:`, err.message);
        }
      }
    }

    console.log("✅ Cron cycle completed");
  } catch (err) {
    console.error("❌ Cron failed:", err.message);
  } finally {
    isJobRunning = false;
  }
});

console.log("🚀 Cron worker initialized (hourly)");





























