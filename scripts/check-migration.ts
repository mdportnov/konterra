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

function readPriorMigrations(latestFile: string): string[] {
  return fs.readdirSync(DRIZZLE_DIR)
    .filter(f => /^0\d+_.*\.sql$/.test(f) && f < latestFile)
    .sort()
    .map(file => fs.readFileSync(path.join(DRIZZLE_DIR, file), 'utf-8'))
}

function collect(sqls: string[], re: RegExp): Set<string> {
  const found = new Set<string>()
  for (const sql of sqls) {
    for (const m of sql.matchAll(re)) found.add(m[1])
  }
  return found
}

function checkMigration() {
  const latest = getLatestMigration()
  if (!latest) {
    console.log('No migration files found.')
    return
  }

  console.log(`Checking: ${latest.name}`)

  if (latest.sql.includes('drizzle-check: allow-manual')) {
    console.log('Migration is marked as a reviewed manual migration (drizzle-check: allow-manual) — skipping heuristics.')
    return
  }

  const warnings: string[] = []
  const errors: string[] = []

  const priorSqls = readPriorMigrations(latest.name)
  const TYPE_RE = /CREATE TYPE "(?:public"\.")?([^"]+)"/g

  // Re-creating a type that an earlier migration already created is the real drift
  // signal. A genuinely new enum is a normal incremental change, so don't cry wolf.
  const priorTypes = collect(priorSqls, TYPE_RE)
  const createdTypes = [...latest.sql.matchAll(TYPE_RE)].map(m => m[1])
  const duplicateTypes = createdTypes.filter(t => priorTypes.has(t))
  if (duplicateTypes.length > 0) {
    errors.push(`CREATE TYPE for already-existing type(s): ${[...new Set(duplicateTypes)].join(', ')}`)
  }
  const newTypes = createdTypes.filter(t => !priorTypes.has(t))
  if (newTypes.length > 4) {
    errors.push(`${newTypes.length} new enum types in one migration — likely a full schema recreation`)
  }

  const dropTableMatches = latest.sql.match(/DROP TABLE /g)
  if (dropTableMatches && dropTableMatches.length > 0) {
    warnings.push(`Found ${dropTableMatches.length} DROP TABLE statement(s)`)
  }

  const dropTypeMatches = latest.sql.match(/DROP TYPE /g)
  if (dropTypeMatches && dropTypeMatches.length > 0) {
    warnings.push(`Found ${dropTypeMatches.length} DROP TYPE statement(s)`)
  }

  const TABLE_RE = /CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"/g
  const priorTables = collect(priorSqls, TABLE_RE)
  const createTableMatches = [...latest.sql.matchAll(TABLE_RE)]
  const duplicateTables = createTableMatches.filter(m => priorTables.has(m[1]))
  if (duplicateTables.length > 0) {
    const names = duplicateTables.map(m => m[1]).join(', ')
    errors.push(`CREATE TABLE for already-existing table(s): ${names}`)
  }

  // The drift failure mode recreates *every* table, so compare against the whole
  // schema rather than a small fixed count that legitimate feature work exceeds.
  const newTables = createTableMatches.filter(m => !priorTables.has(m[1]))
  if (newTables.length > 8 || (priorTables.size > 0 && newTables.length >= priorTables.size)) {
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
