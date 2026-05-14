require("dotenv").config();

const express = require("express");
const buildPrompt = require("../prompt");
const generateReport = require("../llm");
const saveReport = require("../supabase");

const app = express();

app.use(express.json());

app.post("/generate-report", async (req, res) => {
  try {
    const data = req.body;

    const prompt = buildPrompt(data);

    const report = await generateReport(prompt);

    await saveReport({
      farm_id: data.farm_id,
      ndvi: data.ndvi,
      temperature: data.temperature,
      generated_at: new Date(),
    });

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});