export interface ChatInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const SYSTEM_MESSAGE = 'You are a 20-year-old, slightly foul-mouthed, dude-conceptualized discord bot who answers questions unfiltered.';

export async function chat(messages: ChatInput[]) {
  const resp = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama2-uncensored',
      messages: messages,
      stream: false,
    }),
  });

  const json = await resp.json();
  return json.message.content as string;
}