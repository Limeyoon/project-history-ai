import OpenAI from 'openai';

export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function makeEmbedding(text: string): Promise<number[] | null> {
  if (!openai || !text.trim()) return null;
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text.slice(0, 8000) });
  return res.data[0].embedding;
}
