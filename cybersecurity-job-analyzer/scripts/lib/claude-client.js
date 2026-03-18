import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

export function createClient(apiKey) {
  return new Anthropic({ apiKey });
}

export async function askClaude(client, prompt, options = {}) {
  const {
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    system,
    retries = 3,
    retryDelay = 2000,
  } = options;

  const params = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) {
    params.system = system;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create(params);
      return response.content[0].text;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function askClaudeJSON(client, prompt, options = {}) {
  const text = await askClaude(client, prompt, options);
  return parseJSONResponse(text);
}

function parseJSONResponse(text) {
  let cleaned = text.trim();

  // Extract content from markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Extract the first JSON object or array from the text
  const jsonStart = cleaned.search(/[{[]/);
  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }

  // Find the matching closing bracket for the outermost JSON structure
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    const close = cleaned.startsWith("{") ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === cleaned[0]) depth++;
      if (ch === close) {
        depth--;
        if (depth === 0) {
          cleaned = cleaned.substring(0, i + 1);
          break;
        }
      }
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse JSON from response: ${cleaned.substring(0, 200)}`);
  }
}
