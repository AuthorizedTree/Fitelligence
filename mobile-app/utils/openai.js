// mobile-app/utils/openai.js
import OPENAI_API_KEY from "./mobile-app/.env";

const OPENAI_API_KEY = 'sk-YOUR_REAL_KEY';

export async function fetchChatResponse(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model:'gpt-3.5-turbo',
      messages: messages.map(m=>({
        role: m.sender==='user' ? 'user' : 'assistant',
        content: m.text
      }))
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.choices[0].message.content.trim();
}
