import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  const db = drizzle(pool)
  await migrate(db, { migrationsFolder: './drizzle' })
  await pool.end()
  console.log('Migrations applied successfully')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
