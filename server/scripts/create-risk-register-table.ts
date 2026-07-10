import { db } from '../database'
import { sql } from 'drizzle-orm'

async function createRiskRegisterTable() {
  try {
    console.log('Starting migration to create risk_registers table...')

    // 1. Create risk_registers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS risk_registers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        site_id uuid NOT NULL,
        unit_id uuid NOT NULL,
        tahun integer NOT NULL,
        kategori_risiko text NOT NULL,
        risiko text NOT NULL,
        penyebab text NOT NULL,
        dampak text NOT NULL,
        likelihood integer NOT NULL,
        severity integer NOT NULL,
        risk_rating integer NOT NULL,
        level_risiko text NOT NULL,
        mitigasi text NOT NULL,
        status text DEFAULT 'proposed' NOT NULL,
        created_by uuid NOT NULL,
        approved_by uuid,
        approved_at timestamp,
        rejected_notes text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      )
    `)
    console.log('✓ Created risk_registers table')

    // 1.5. Ensure tahun column exists (in case table already existed)
    await db.execute(sql`
      ALTER TABLE risk_registers ADD COLUMN IF NOT EXISTS tahun integer;
      UPDATE risk_registers SET tahun = 2026 WHERE tahun IS NULL;
      ALTER TABLE risk_registers ALTER COLUMN tahun SET NOT NULL;
    `)
    console.log('✓ Verified tahun column exists in risk_registers')

    // 2. Add constraints to risk_registers
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'risk_registers_site_id_sites_id_fk'
        ) THEN
          ALTER TABLE risk_registers 
          ADD CONSTRAINT risk_registers_site_id_sites_id_fk 
          FOREIGN KEY (site_id) 
          REFERENCES sites(id) 
          ON DELETE CASCADE;
        END IF;
      END $$
    `)

    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'risk_registers_unit_id_units_id_fk'
        ) THEN
          ALTER TABLE risk_registers 
          ADD CONSTRAINT risk_registers_unit_id_units_id_fk 
          FOREIGN KEY (unit_id) 
          REFERENCES units(id) 
          ON DELETE CASCADE;
        END IF;
      END $$
    `)

    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'risk_registers_created_by_users_id_fk'
        ) THEN
          ALTER TABLE risk_registers 
          ADD CONSTRAINT risk_registers_created_by_users_id_fk 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE RESTRICT;
        END IF;
      END $$
    `)

    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'risk_registers_approved_by_users_id_fk'
        ) THEN
          ALTER TABLE risk_registers 
          ADD CONSTRAINT risk_registers_approved_by_users_id_fk 
          FOREIGN KEY (approved_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL;
        END IF;
      END $$
    `)
    console.log('✓ Added all risk_registers foreign keys')

    console.log('\n✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

createRiskRegisterTable()
