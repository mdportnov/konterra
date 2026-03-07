import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const DRIZZLE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'drizzle')

function getLatestMigration(): { name: string; sql: string } | null {
  const files = fs.readdirSync(DRIZZLE_DIR)
    .filter(f => /^0\d+_.*\.sql$/.test(f))
    .sort()

  if (files.length === 0) return null
  const name = files[files.length - 1]
  const sql = fs.readFileSync(path.join(DRIZZLE_DIR, name), 'utf-8')
  return { name, sql }
}

function getTablesFromPriorMigrations(latestFile: string): Set<string> {
  const tables = new Set<string>()
  const files = fs.readdirSync(DRIZZLE_DIR)
    .filter(f => /^0\d+_.*\.sql$/.test(f) && f < latestFile)
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(DRIZZLE_DIR, file), 'utf-8')
    const matches = sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"/g)
    for (const m of matches) tables.add(m[1])
  }
  return tables
}

function checkMigration() {
  const latest = getLatestMigration()
  if (!latest) {
    console.log('No migration files found.')
    return
  }

  console.log(`Checking: ${latest.name}`)

  const warnings: string[] = []
  const errors: string[] = []

  const createTypeMatches = latest.sql.match(/CREATE TYPE /g)
  if (createTypeMatches && createTypeMatches.length > 0) {
    errors.push(`Found ${createTypeMatches.length} CREATE TYPE statement(s) — likely a full schema recreation`)
  }

  const dropTableMatches = latest.sql.match(/DROP TABLE /g)
  if (dropTableMatches && dropTableMatches.length > 0) {
    warnings.push(`Found ${dropTableMatches.length} DROP TABLE statement(s)`)
  }

  const dropTypeMatches = latest.sql.match(/DROP TYPE /g)
  if (dropTypeMatches && dropTypeMatches.length > 0) {
    warnings.push(`Found ${dropTypeMatches.length} DROP TYPE statement(s)`)
  }

  const priorTables = getTablesFromPriorMigrations(latest.name)
  const createTableMatches = [...latest.sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"/g)]
  const duplicateTables = createTableMatches.filter(m => priorTables.has(m[1]))
  if (duplicateTables.length > 0) {
    const names = duplicateTables.map(m => m[1]).join(', ')
    errors.push(`CREATE TABLE for already-existing table(s): ${names}`)
  }

  const newTables = createTableMatches.filter(m => !priorTables.has(m[1]))
  if (newTables.length > 3) {
    errors.push(`${newTables.length} new tables in one migration — likely a full schema recreation`)
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:')
    warnings.forEach(w => console.log(`  - ${w}`))
  }

  if (errors.length > 0) {
    console.log('\nErrors (likely broken migration):')
    errors.forEach(e => console.log(`  - ${e}`))
    console.log('\nThis migration looks like a full schema recreation rather than an incremental diff.')
    console.log('Possible causes:')
    console.log('  1. Snapshot files were missing (not committed or deleted)')
    console.log('  2. db:generate was run from a stale/clean checkout without snapshots')
    console.log('\nFix: delete the generated file, ensure drizzle/meta snapshots are present, re-run db:generate')
    process.exit(1)
  }

  if (warnings.length === 0) {
    console.log('Migration looks good.')
  }
}

checkMigration()
