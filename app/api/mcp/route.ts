import { NextResponse } from 'next/server'
import { z } from 'zod'
import { MCP_TOOLS, MCP_TOOL_MAP } from '@/lib/mcp/tools'
import { hashApiToken } from '@/lib/mcp/token'
import { getApiTokenByHash, touchApiTokenLastUsed } from '@/lib/db/queries'

export const runtime = 'nodejs'

const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const SERVER_INFO = { name: 'konterra', version: '1.0.0' }

interface JsonRpcMessage {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

interface AuthContext {
  userId: string
  scopes: string[]
}

function rpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result }
}

function rpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id, error: { code, message } }
}

function unauthorizedResponse(message: string) {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message } },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="konterra-mcp"' } }
  )
}

async function authenticate(req: Request): Promise<AuthContext | NextResponse> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) {
    return unauthorizedResponse('Missing Authorization header. Create an API token in Konterra Settings → Integrations and send it as "Authorization: Bearer <token>".')
  }
  const token = header.slice('Bearer '.length).trim()
  if (!token) return unauthorizedResponse('Empty bearer token')

  const record = await getApiTokenByHash(hashApiToken(token))
  if (!record) return unauthorizedResponse('Invalid API token')
  if (record.expiresAt && record.expiresAt <= new Date()) {
    return unauthorizedResponse('API token has expired')
  }
  touchApiTokenLastUsed(record.id).catch(() => {})
  return { userId: record.userId, scopes: record.scopes }
}

function toolList(scopes: string[]) {
  return MCP_TOOLS
    .filter((t) => scopes.includes(t.scope))
    .map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: z.toJSONSchema(t.inputSchema),
    }))
}

async function handleMessage(msg: JsonRpcMessage, auth: AuthContext): Promise<Record<string, unknown> | null> {
  const id = msg.id ?? null
  const method = msg.method

  if (!method) return rpcError(id, -32600, 'Invalid request: missing method')

  if (method.startsWith('notifications/')) return null

  switch (method) {
    case 'initialize': {
      const requested = msg.params?.protocolVersion
      const protocolVersion =
        typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : SUPPORTED_PROTOCOL_VERSIONS[0]
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'Konterra personal CRM and travel tracker. Tools are limited to the scopes granted to your API token.',
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: toolList(auth.scopes) })
    case 'tools/call': {
      const name = msg.params?.name
      if (typeof name !== 'string') return rpcError(id, -32602, 'Invalid params: name is required')
      const tool = MCP_TOOL_MAP.get(name)
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${name}`)
      if (!auth.scopes.includes(tool.scope)) {
        return rpcError(id, -32001, `API token is missing the "${tool.scope}" scope required by ${name}`)
      }
      const parsed = tool.inputSchema.safeParse(msg.params?.arguments ?? {})
      if (!parsed.success) {
        const detail = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
        return rpcResult(id, {
          content: [{ type: 'text', text: `Invalid arguments: ${detail}` }],
          isError: true,
        })
      }
      try {
        const result = await tool.handler(auth.userId, parsed.data as Record<string, unknown>)
        if ('error' in result) {
          return rpcResult(id, { content: [{ type: 'text', text: result.error }], isError: true })
        }
        return rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Tool execution failed'
        return rpcResult(id, { content: [{ type: 'text', text: message }], isError: true })
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticate(req)
    if (auth instanceof NextResponse) return auth

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(rpcError(null, -32700, 'Parse error: invalid JSON'), { status: 400 })
    }

    if (Array.isArray(body)) {
      const responses = (await Promise.all(body.map((m) => handleMessage(m as JsonRpcMessage, auth))))
        .filter((r): r is Record<string, unknown> => r !== null)
      if (responses.length === 0) return new NextResponse(null, { status: 202 })
      return NextResponse.json(responses)
    }

    const response = await handleMessage(body as JsonRpcMessage, auth)
    if (response === null) return new NextResponse(null, { status: 202 })
    return NextResponse.json(response)
  } catch (e) {
    console.error('MCP endpoint error:', e)
    return NextResponse.json(rpcError(null, -32603, 'Internal error'), { status: 500 })
  }
}

export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}
