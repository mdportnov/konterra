import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MCP_TOOLS } from '@/lib/mcp/tools'
import { getUserByEmail } from '@/lib/db/queries'

let cachedUserId: string | null = null

async function requireUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId
  const email = process.env.KONTERRA_USER_EMAIL
  if (!email) {
    throw new Error('KONTERRA_USER_EMAIL is not set. Set it to the email of the Konterra account this server should operate on.')
  }
  const user = await getUserByEmail(email.toLowerCase().trim())
  if (!user) throw new Error(`No Konterra user found for email ${email}`)
  cachedUserId = user.id
  return user.id
}

export function createKonterraServer(): McpServer {
  const server = new McpServer({ name: 'konterra', version: '1.0.0' })

  for (const tool of MCP_TOOLS) {
    server.registerTool(tool.name, {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema.shape,
    }, async (args: Record<string, unknown>) => {
      const userId = await requireUserId()
      const result = await tool.handler(userId, args ?? {})
      if ('error' in result) {
        return { content: [{ type: 'text' as const, text: result.error }], isError: true }
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] }
    })
  }

  return server
}
