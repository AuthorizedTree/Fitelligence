// mobile-app/utils/claude.js

import Constants from 'expo-constants';

const CLAUDE_API_KEY    = Constants.expoConfig.extra.claudeApiKey;
const CLAUDE_URL        = 'https://api.anthropic.com/v1/chat/completions';
const ANTHROPIC_VERSION = '2023-06-01';

if (!CLAUDE_API_KEY) {
  throw new Error('Missing Claude API key in expo.extra.claudeApiKey');
}

/**
 * Send a chat history to Claude via the Messages API.
 * @param {Array<{ sender: 'user'|'assistant', text: string }>} messages 
 */
export async function fetchClaudeResponse(messages) {
  // convert our shape to Anthropic messages
  const anthropicMessages = messages.map(m => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text
  }));

  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         CLAUDE_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      messages: anthropicMessages,
      temperature: 0.7,
      max_tokens_to_sample: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const { choices } = await res.json();
  // The API returns an array of one choice
  const reply = choices[0].message.content;
  return reply.trim();
}
