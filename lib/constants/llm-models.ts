export interface LLMModel {
  id: string
  name: string
  provider: 'google' | 'anthropic'
  priority: number
  description: string
}

export const LLM_MODELS: LLMModel[] = [
  {
    id: 'google/gemini-2.5-flash-preview',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    priority: 1,
    description: 'Fast and cost-effective, great for most tasks',
  },
  {
    id: 'google/gemini-2.5-pro-preview',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    priority: 2,
    description: 'More capable, better reasoning and analysis',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    priority: 3,
    description: 'Stable release, reliable performance',
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    priority: 4,
    description: 'Balanced intelligence and speed',
  },
  {
    id: 'anthropic/claude-haiku-4',
    name: 'Claude Haiku 4',
    provider: 'anthropic',
    priority: 5,
    description: 'Fast and affordable, good for simple tasks',
  },
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    priority: 6,
    description: 'Most capable Claude, best for complex analysis',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    priority: 7,
    description: 'Previous generation, proven reliability',
  },
]

export const DEFAULT_MODEL_ID = 'google/gemini-2.5-flash-preview'

export const SETTING_KEY_LLM_MODEL = 'llm_model'
