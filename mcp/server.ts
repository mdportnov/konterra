import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

async function main() {
  const [{ createKonterraServer }, { StdioServerTransport }] = await Promise.all([
    import('./konterra'),
    import('@modelcontextprotocol/sdk/server/stdio.js'),
  ])
  const server = createKonterraServer()
  await server.connect(new StdioServerTransport())
  console.error('Konterra MCP server running on stdio')
}

main().catch((err) => {
  console.error('Failed to start Konterra MCP server:', err)
  process.exit(1)
})
