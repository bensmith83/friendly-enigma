import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "..", "data");

export function getDataPath(filename) {
  return path.join(DATA_DIR, filename);
}

export function readJSON(filePath, defaultValue = null) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

export function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

export function appendToArray(filePath, items) {
  const existing = readJSON(filePath, []);
  writeJSON(filePath, [...existing, ...items]);
}
