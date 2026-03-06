export interface LLMModel {
  id: string
  name: string
  provider: 'google' | 'anthropic'
  priority: number
  context: string
  pricing: string
  description: string
}

export const LLM_MODELS: LLMModel[] = [
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    priority: 1,
    context: '1M',
    pricing: 'low',
    description: 'Latest Flash — fast agentic workflows and coding',
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    priority: 2,
    context: '1M',
    pricing: '$2/$12',
    description: 'Frontier reasoning, best Gemini for complex analysis',
  },
  {
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'google',
    priority: 3,
    context: '1M',
    pricing: '$2/$12',
    description: 'High-precision multimodal reasoning',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    priority: 4,
    context: '1M',
    pricing: '$2/$12',
    description: 'Advanced reasoning, coding, and math',
  },
  {
    id: 'google/gemini-2.5-flash-preview-09-2025',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    priority: 5,
    context: '1M',
    pricing: 'low',
    description: 'Workhorse model with built-in thinking',
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    priority: 6,
    context: '1M',
    pricing: 'very low',
    description: 'Ultra-low latency and cost',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    priority: 7,
    context: '1M',
    pricing: '$3/$15',
    description: 'Latest Sonnet — strongest reasoning for agents',
  },
  {
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    priority: 8,
    context: '1M',
    pricing: '$5/$25',
    description: 'Most capable Claude, best for deep analysis',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    priority: 9,
    context: '1M',
    pricing: '$3/$15',
    description: 'Advanced Sonnet, optimized for coding and agents',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    priority: 10,
    context: '200K',
    pricing: '$1/$5',
    description: 'Fast and affordable, good for simple tasks',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    priority: 11,
    context: '1M',
    pricing: 'low',
    description: 'Stable previous gen, reliable performance',
  },
]

export const DEFAULT_MODEL_ID = 'google/gemini-3-flash-preview'

export const SETTING_KEY_LLM_MODEL = 'llm_model'
