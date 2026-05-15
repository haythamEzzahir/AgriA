import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const cwd = process.cwd();
const envPath = path.resolve(cwd, ".env");

function maskApiKey(apiKey) {
  if (!apiKey) {
    return "undefined";
  }

  const trimmed = apiKey.trim();
  if (trimmed.length <= 14) {
    return `${trimmed.substring(0, 10)}...`;
  }

  return `${trimmed.substring(0, 10)}...${trimmed.slice(-4)}`;
}

function isSimilarEnvName(name) {
  const normalized = name.toUpperCase();
  return (
    normalized.startsWith("OPENROUTER") ||
    normalized.includes("OPEN_ROUTER") ||
    normalized.includes("OPENROUTER") ||
    normalized.includes("ROUTER_API") ||
    normalized === "API_KEY" ||
    normalized.endsWith("_API_KEY")
  );
}

console.log("🔍 Checking OpenRouter environment configuration");
console.log(`🔍 Current working directory: ${cwd}`);
console.log(`🔍 dotenv is looking for .env at: ${envPath}`);

const envExists = fs.existsSync(envPath);
console.log(`🔍 .env exists in current directory: ${envExists ? "yes" : "no"}`);

if (envExists) {
  const rawEnv = fs.readFileSync(envPath, "utf8");
  const lineEnding = rawEnv.includes("\r\n") ? "CRLF" : "LF";
  console.log(`🔍 .env line endings: ${lineEnding}`);
}

const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.error(`❌ dotenv failed to load .env: ${dotenvResult.error.message}`);
} else {
  const parsedKeys = Object.keys(dotenvResult.parsed || {});
  console.log(`✅ dotenv loaded .env successfully (${parsedKeys.length} keys parsed)`);

  const parsedSimilarKeys = parsedKeys.filter(isSimilarEnvName);
  if (parsedSimilarKeys.length > 0) {
    console.log(`🔍 Similar keys parsed from .env: ${parsedSimilarKeys.join(", ")}`);
  }
}

const apiKey = process.env.OPENROUTER_API_KEY;

if (apiKey) {
  const trimmed = apiKey.trim();
  console.log("✅ OPENROUTER_API_KEY is defined");
  console.log(`🔍 Masked key: ${maskApiKey(trimmed)}`);
  console.log(`🔍 First 10 characters: ${trimmed.substring(0, 10)}...`);
  console.log(`🔍 Total length: ${trimmed.length}`);
  console.log(`🔍 Starts with sk-or-v1-: ${trimmed.startsWith("sk-or-v1-") ? "yes" : "no"}`);
} else {
  console.error("❌ OPENROUTER_API_KEY is NOT defined in process.env");

  const similarProcessKeys = Object.keys(process.env).filter(isSimilarEnvName).sort();
  if (similarProcessKeys.length > 0) {
    console.log("🔍 Similar environment variables found:");
    for (const key of similarProcessKeys) {
      const value = process.env[key] || "";
      console.log(`  - ${key}: ${maskApiKey(value)} (length ${value.trim().length})`);
    }
  } else {
    console.log("🔍 No OPENROUTER-like environment variables found in process.env");
  }
}
