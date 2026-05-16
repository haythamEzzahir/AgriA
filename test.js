import fs from "fs/promises";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;
const API_URL = `http://localhost:${PORT}/generate-report`;

async function runTest() {
  try {
    console.log("🧪 Loading test farm data...");
    const rawData = await fs.readFile(new URL("./test-data.json", import.meta.url), "utf8");
    const farmData = JSON.parse(rawData);

    console.log(`📡 Sending POST request to ${API_URL}`);
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(farmData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Test request failed:");
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    console.log("✅ Test request succeeded:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Make sure the server is running with: npm start");
    process.exit(1);
  }
}

runTest();
