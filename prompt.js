const SUPPORTED_LANGUAGES = ["darija", "arabic", "french", "english"];

function normalizeLanguage(language) {
  if (!language) return "english";
  const normalized = String(language).toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "english";
}

export function buildPrompt(farmData) {
  const language = normalizeLanguage(farmData.language);
  const isDarija = language === "darija";
  const isArabic = language === "arabic";

  const headings = isDarija
    ? ["📌 الملاحظة", "🌱 النصيحة"]
    : isArabic
      ? ["PART 1 - الملاحظة", "PART 2 - النصيحة"]
      : ["PART 1 - DETECTION", "PART 2 - ADVICE"];

  const languageRules = isDarija
    ? `
Darija language rules:
- Write Moroccan Darija using Arabic letters ONLY.
- Do NOT write Darija with Latin letters.
- Do NOT use difficult classical Arabic.
- Use simple Moroccan words a falah understands.
- Use a warm, practical, respectful tone.
- Use short sentences.
- The report must use exactly these two headings, with no other headings:
  ${headings[0]}
  ${headings[1]}
- Under each heading, write short natural text. Do not use bullet points for Darija.
- Good Darija words to use: النبات باين تعبان شوية، الأرض ناشفة، خاص السقي، الحرارة طالعة بزاف، الوراق خاصهم يتراقبو، شوف واش التراب ناشف.
- Practical advice examples: سقي بكري فالصباح ولا مع العشية، ماتسقيش فالسخونية، راقب الوراق إلا بداو كيصفرو، شوف واش التراب ناشف.
`
    : isArabic
      ? `
Arabic language rules:
- Write in very simple Arabic that a Moroccan farmer can understand easily.
- Write like you are speaking directly to a Moroccan falah, with respect.
- Use short, natural sentences. Be practical and direct.
- Avoid difficult Modern Standard Arabic words.
- Do not use technical Arabic such as: إجهاد مائي، مؤشر، رطوبة التربة، قمر صناعي، تحليل نباتي.
- Use simple farmer words such as: النباتات تبدو ضعيفة، الأرض جافة، الحرارة مرتفعة، النبات يحتاج ماء، النبات يبدو عطشان.
- The report must contain exactly these 2 headings:
  ${headings[0]}
  ${headings[1]}
`
      : `
Language rules:
- Write the final report in ${language}.
`;

  const outputFormat = isDarija
    ? `
Required output format:
${headings[0]}
Text in Moroccan Darija using Arabic letters only.

${headings[1]}
Text in Moroccan Darija using Arabic letters only.
`
    : `
Required output format:
${headings[0]}
- ...
- ...

${headings[1]}
- ...
- ...
`;

  const examples = isDarija
    ? `
Darija example to follow:
📌 الملاحظة
الطماطم باينة محتاجة الما شوية والتراب ناشف والحرارة طالعة.

🌱 النصيحة
من الأحسن تسقي بكري فالصباح ولا مع العشية وماتسقيش فوقت السخونية. راقب الوراق إلا بداو كيصفرو.
`
    : `
Arabic examples, simple and natural:
PART 1 - الملاحظة
- النبات يبدو عطشان شوية ويحتاج السقي.
- الأرض جافة، والحرارة مرتفعة وقد تتعب الزرع.

PART 2 - النصيحة
- من الأفضل السقي صباحا أو بعد العصر.
- لا تسق وقت الحرارة المرتفعة، وراقب الأوراق الصفراء.

French example:
PART 1 - DETECTION
- L'etat des plantes semble moyen, avec un manque d'eau possible.
- Le sol parait sec et la forte chaleur peut fatiguer la culture.

PART 2 - ADVICE
- Irriguez tot le matin ou en fin de journee.
- Verifiez les feuilles jaunes et l'humidite du sol, et evitez d'irriguer en pleine chaleur.

English example:
PART 1 - DETECTION
- Plant health looks moderate, with possible lack of water.
- The soil looks dry, and high heat may stress the crop.

PART 2 - ADVICE
- Irrigate early in the morning or late in the afternoon.
- Check yellow leaves and soil dryness before adding more water, and avoid watering during strong heat.
`;

  return `
You are AgriCopilot AI, an assistant that writes short, practical farming reports for Moroccan farmers.

${languageRules}

The farmer sent this farm data:
${JSON.stringify(farmData, null, 2)}

Use this agronomic logic internally:
- NDVI < 0.3 means plants are in poor health.
- NDVI between 0.3 and 0.5 means moderate health.
- NDVI > 0.5 means healthy plants.
- NDWI < 0.2 means water stress.
- soil_moisture < 0.2 means very dry soil.
- surface_temp > 35 C means heat stress risk.
- weather.temperature > 38 C means urgent irrigation may be needed.
- weather.temperature < 5 C means frost risk.

Final report rules:
- Return exactly 2 parts, with exactly these headings:
  ${headings[0]}
  ${headings[1]}
- Do not add any introduction, conclusion, disclaimer, or extra section.
- Keep each part short and easy to understand.
- Use a warm, calm, farmer-friendly tone.
- Mention the crop, location, and main risks only when available in the data.
- Do not invent exact facts that are not supported by the data.
- Do not use technical terms or raw field names in the final report, including: NDVI, NDWI, moisture, soil_moisture, soil moisture, surface_temp, satellite, satellite index, index, sensor, water stress.
- In Darija, never use Latin Darija. Use Arabic letters only.
- In Darija, do not use difficult classical Arabic.
- In Arabic or Darija, never use these words or phrases in the final report: NDVI, NDWI, moisture, satellite index, water stress, إجهاد مائي، مؤشر، رطوبة، رطوبة التربة، قمر صناعي.
- Explain observations only with simple farmer words, like: plant looks tired, dry soil, needs water, high heat, leaves need checking.
- In Darija, explain with words like: النبات باين تعبان شوية، الأرض ناشفة، خاص السقي، الحرارة طالعة بزاف، الوراق خاصهم يتراقبو.
- Advice must be concrete and useful: tell the farmer when to irrigate, what to check in the field, and what to avoid.
- Good Darija advice: سقي بكري فالصباح ولا مع العشية، ماتسقيش فالسخونية، راقب الوراق إلا بداو كيصفرو، شوف واش التراب ناشف.
- Avoid vague advice like "monitor regularly" unless you also say exactly what to check.
- If data is normal, say that the field looks stable and give light preventive advice.

${outputFormat}

${examples}

Return only the report text.
`.trim();
}
