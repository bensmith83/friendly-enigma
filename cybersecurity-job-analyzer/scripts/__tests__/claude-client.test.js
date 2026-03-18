import { jest } from "@jest/globals";

// Mock the Anthropic SDK before importing
const mockCreate = jest.fn();
jest.unstable_mockModule("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    constructor() {
      this.messages = { create: mockCreate };
    }
  },
}));

const { createClient, askClaude, askClaudeJSON } = await import("../lib/claude-client.js");

describe("claude-client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createClient", () => {
    it("creates a client with the provided API key", () => {
      const client = createClient("test-key");
      expect(client).toBeDefined();
      expect(client.messages).toBeDefined();
    });
  });

  describe("askClaude", () => {
    it("sends a message and returns the text response", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Hello from Claude" }],
      });

      const result = await askClaude(createClient("key"), "Say hello");
      expect(result).toBe("Hello from Claude");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Say hello" }],
        })
      );
    });

    it("uses default model and max_tokens", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "ok" }],
      });

      await askClaude(createClient("key"), "test");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
        })
      );
    });

    it("allows overriding model and max_tokens", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "ok" }],
      });

      await askClaude(createClient("key"), "test", {
        model: "claude-haiku-4-5-20251001",
        maxTokens: 1000,
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
        })
      );
    });

    it("retries on transient errors with exponential backoff", async () => {
      mockCreate
        .mockRejectedValueOnce(new Error("overloaded"))
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "success" }],
        });

      const result = await askClaude(createClient("key"), "test", { retries: 3, retryDelay: 10 });
      expect(result).toBe("success");
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("throws after exhausting retries", async () => {
      mockCreate.mockRejectedValue(new Error("persistent error"));

      await expect(
        askClaude(createClient("key"), "test", { retries: 2, retryDelay: 10 })
      ).rejects.toThrow("persistent error");
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe("askClaudeJSON", () => {
    it("parses JSON from Claude response", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: '{"companies": ["CrowdStrike"]}' }],
      });

      const result = await askClaudeJSON(createClient("key"), "list companies");
      expect(result).toEqual({ companies: ["CrowdStrike"] });
    });

    it("extracts JSON from markdown code blocks", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: 'Here is the data:\n```json\n{"count": 5}\n```',
          },
        ],
      });

      const result = await askClaudeJSON(createClient("key"), "count");
      expect(result).toEqual({ count: 5 });
    });

    it("extracts JSON when followed by trailing text", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: '{"jobs": []}\n\nThe HTML provided is a landing page, not a job listings page.',
          },
        ],
      });

      const result = await askClaudeJSON(createClient("key"), "extract");
      expect(result).toEqual({ jobs: [] });
    });

    it("extracts JSON from code fence with trailing text", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: '```json\n{"jobs": []}\n```\n\nThe page does not contain job listings.',
          },
        ],
      });

      const result = await askClaudeJSON(createClient("key"), "extract");
      expect(result).toEqual({ jobs: [] });
    });

    it("throws on invalid JSON response", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "not json at all" }],
      });

      await expect(askClaudeJSON(createClient("key"), "bad")).rejects.toThrow();
    });
  });
});
