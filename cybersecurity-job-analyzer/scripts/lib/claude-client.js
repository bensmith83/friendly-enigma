import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250514";
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
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }
    throw new Error(`Failed to parse JSON from response: ${text.substring(0, 200)}`);
  }
}
