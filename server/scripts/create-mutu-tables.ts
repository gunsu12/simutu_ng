import { db } from '../database'
import { sql } from 'drizzle-orm'

async function createTables() {
  try {
    // Create indicator_categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS indicator_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        name text NOT NULL,
        description text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `)
    console.log('✓ Created indicator_categories table')

    // Create indicators table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS indicators (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        indicator_category_id uuid NOT NULL,
        code text NOT NULL,
        judul text NOT NULL,
        dimensi_mutu text,
        tujuan text,
        definisi_operasional text,
        formula text,
        numerator text,
        denominator text,
        target numeric,
        target_unit text,
        target_keterangan text,
        target_is_zero boolean DEFAULT false,
        target_calculation_formula text,
        document_file text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT indicators_code_unique UNIQUE(code)
      )
    `)
    console.log('✓ Created indicators table')

    // Add foreign key
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'indicators_indicator_category_id_fkey'
        ) THEN
          ALTER TABLE indicators 
          ADD CONSTRAINT indicators_indicator_category_id_fkey 
          FOREIGN KEY (indicator_category_id) 
          REFERENCES indicator_categories(id) 
          ON DELETE CASCADE;
        END IF;
      END $$
    `)
    console.log('✓ Added foreign key constraint')

    console.log('\n✅ All tables created successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating tables:', error)
    process.exit(1)
  }
}

createTables()
