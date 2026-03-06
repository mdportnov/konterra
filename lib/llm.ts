import { env } from '@/lib/env'
import { getSetting } from '@/lib/db/queries'
import { DEFAULT_MODEL_ID, SETTING_KEY_LLM_MODEL } from '@/lib/constants/llm-models'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  content: string
  model: string
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<LLMResponse> {
  const apiKey = env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  let model = options?.model
  if (!model) {
    const saved = await getSetting(SETTING_KEY_LLM_MODEL)
    model = saved ?? DEFAULT_MODEL_ID
  }

  const temperature = options?.temperature ?? 0.7
  const maxTokens = options?.maxTokens ?? 2048

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Empty response from LLM')
  }

  return { content, model }
}
