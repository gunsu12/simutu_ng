import { db } from '../database'
import { sql } from 'drizzle-orm'

async function addTahunColumn() {
  try {
    console.log('Adding "tahun" column to "risk_registers" table...')
    await db.execute(sql`
      ALTER TABLE risk_registers 
      ADD COLUMN IF NOT EXISTS tahun integer NOT NULL DEFAULT 2026;
    `)
    console.log('✓ Added "tahun" column successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

addTahunColumn()
