import fs from "fs";
import path from "path";
import { readJSON, writeJSON, appendToArray, getDataPath } from "../lib/data-store.js";

describe("data-store", () => {
  const testDir = path.join(process.cwd(), "__tests__", "tmp");
  const testFile = path.join(testDir, "test.json");

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe("getDataPath", () => {
    it("returns a path relative to the data directory", () => {
      const result = getDataPath("companies.json");
      expect(result).toContain("data");
      expect(result).toContain("companies.json");
    });
  });

  describe("readJSON", () => {
    it("reads and parses a JSON file", () => {
      fs.writeFileSync(testFile, JSON.stringify({ name: "test" }));
      const result = readJSON(testFile);
      expect(result).toEqual({ name: "test" });
    });

    it("returns default value when file does not exist", () => {
      const result = readJSON("/nonexistent/file.json", []);
      expect(result).toEqual([]);
    });

    it("returns default value when file contains invalid JSON", () => {
      fs.writeFileSync(testFile, "not json");
      const result = readJSON(testFile, { fallback: true });
      expect(result).toEqual({ fallback: true });
    });
  });

  describe("writeJSON", () => {
    it("writes data as formatted JSON", () => {
      writeJSON(testFile, { key: "value" });
      const content = fs.readFileSync(testFile, "utf-8");
      expect(JSON.parse(content)).toEqual({ key: "value" });
      expect(content).toContain("\n"); // formatted
    });

    it("creates parent directories if they do not exist", () => {
      const nested = path.join(testDir, "nested", "deep", "file.json");
      writeJSON(nested, { deep: true });
      expect(JSON.parse(fs.readFileSync(nested, "utf-8"))).toEqual({ deep: true });
      fs.rmSync(path.join(testDir, "nested"), { recursive: true });
    });
  });

  describe("appendToArray", () => {
    it("appends items to an existing array file", () => {
      writeJSON(testFile, [{ id: 1 }]);
      appendToArray(testFile, [{ id: 2 }]);
      const result = readJSON(testFile);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("creates file with items if it does not exist", () => {
      appendToArray(testFile, [{ id: 1 }]);
      const result = readJSON(testFile);
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});
