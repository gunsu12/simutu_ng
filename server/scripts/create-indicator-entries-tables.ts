import { sql } from 'drizzle-orm'
import { db } from '../database'

async function createIndicatorEntriesTables() {
  console.log('Creating indicator_entries and indicator_entry_items tables...')

  try {
    // Create indicator_entries table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS indicator_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_code TEXT NOT NULL UNIQUE,
        unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        entry_date TIMESTAMP NOT NULL,
        entry_frequency TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'proposed',
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        updated_by UUID REFERENCES users(id) ON DELETE RESTRICT,
        auditor_notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `)
    console.log('✓ indicator_entries table created')

    // Create indicator_entry_items table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS indicator_entry_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        indicator_entry_id UUID NOT NULL REFERENCES indicator_entries(id) ON DELETE CASCADE,
        indicator_id UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
        numerator_value NUMERIC,
        denominator_value NUMERIC,
        skor NUMERIC,
        numerator_denominator_result NUMERIC,
        is_already_checked BOOLEAN NOT NULL DEFAULT false,
        is_need_pdca BOOLEAN NOT NULL DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ indicator_entry_items table created')

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_indicator_entries_unit_id ON indicator_entries(unit_id)
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_indicator_entries_status ON indicator_entries(status)
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_indicator_entry_items_entry_id ON indicator_entry_items(indicator_entry_id)
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_indicator_entry_items_indicator_id ON indicator_entry_items(indicator_id)
    `)
    console.log('✓ Indexes created')

    console.log('All tables created successfully!')
  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

createIndicatorEntriesTables()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
