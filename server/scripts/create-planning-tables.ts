import { db } from '../database'
import { sql } from 'drizzle-orm'

async function createPlanningTables() {
  try {
    console.log('Starting migration to create indicator_plans and indicator_profiles...')

    // 1. Create indicator_profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS indicator_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        indicator_id uuid NOT NULL,
        dasar_pemikiran text,
        jenis_indikator text,
        satuan_pengukuran text,
        kriteria_inklusi text,
        kriteria_eksklusi text,
        metode_pengumpulan_data text,
        sumber_data text,
        instrumen_pengambilan_data text,
        besar_sampel text,
        cara_pengambilan_sampel text,
        periode_pengumpulan_data text,
        penyajian_data text,
        periode_analisis_dan_pelaporan_data text,
        penanggung_jawab text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT indicator_profiles_indicator_id_unique UNIQUE(indicator_id)
      )
    `)
    console.log('✓ Created indicator_profiles table')

    // 2. Create indicator_plans table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS indicator_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        site_id uuid NOT NULL,
        unit_id uuid NOT NULL,
        indicator_category_id uuid NOT NULL,
        judul text NOT NULL,
        status text DEFAULT 'proposed' NOT NULL,
        k1 integer DEFAULT 1 NOT NULL,
        k2 integer DEFAULT 1 NOT NULL,
        k3 integer DEFAULT 1 NOT NULL,
        k4 integer DEFAULT 1 NOT NULL,
        k5 integer DEFAULT 1 NOT NULL,
        k6 integer DEFAULT 1 NOT NULL,
        k7 integer DEFAULT 1 NOT NULL,
        k8 integer DEFAULT 1 NOT NULL,
        total_score integer DEFAULT 8 NOT NULL,
        dasar_pemikiran text,
        dimensi_mutu text,
        tujuan text,
        definisi_operasional text,
        jenis_indikator text,
        satuan_pengukuran text,
        numerator text,
        denominator text,
        formula text,
        target numeric,
        target_unit text,
        target_keterangan text,
        target_is_zero boolean DEFAULT false,
        target_calculation_formula text,
        kriteria_inklusi text,
        kriteria_eksklusi text,
        metode_pengumpulan_data text,
        sumber_data text,
        instrumen_pengambilan_data text,
        besar_sampel text,
        cara_pengambilan_sampel text,
        periode_pengumpulan_data text,
        penyajian_data text,
        periode_analisis_dan_pelaporan_data text,
        penanggung_jawab text,
        created_by uuid NOT NULL,
        approved_by uuid,
        approved_at timestamp,
        rejected_notes text,
        indicator_id uuid,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      )
    `)
    console.log('✓ Created indicator_plans table')

    // 3. Add constraints to indicator_profiles
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'indicator_profiles_indicator_id_indicators_id_fk'
        ) THEN
          ALTER TABLE indicator_profiles 
          ADD CONSTRAINT indicator_profiles_indicator_id_indicators_id_fk 
          FOREIGN KEY (indicator_id) 
          REFERENCES indicators(id) 
          ON DELETE CASCADE;
        END IF;
      END $$
    `)
    console.log('✓ Added indicator_profiles foreign key')

    // 4. Add constraints to indicator_plans
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'indicator_plans_site_id_sites_id_fk'
        ) THEN
          ALTER TABLE indicator_plans 
          ADD CONSTRAINT indicator_plans_site_id_sites_id_fk 
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
          WHERE conname = 'indicator_plans_unit_id_units_id_fk'
        ) THEN
          ALTER TABLE indicator_plans 
          ADD CONSTRAINT indicator_plans_unit_id_units_id_fk 
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
          WHERE conname = 'indicator_plans_indicator_category_id_indicator_categories_id_fk'
        ) THEN
          ALTER TABLE indicator_plans 
          ADD CONSTRAINT indicator_plans_indicator_category_id_indicator_categories_id_fk 
          FOREIGN KEY (indicator_category_id) 
          REFERENCES indicator_categories(id) 
          ON DELETE CASCADE;
        END IF;
      END $$
    `)

    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'indicator_plans_created_by_users_id_fk'
        ) THEN
          ALTER TABLE indicator_plans 
          ADD CONSTRAINT indicator_plans_created_by_users_id_fk 
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
          WHERE conname = 'indicator_plans_approved_by_users_id_fk'
        ) THEN
          ALTER TABLE indicator_plans 
          ADD CONSTRAINT indicator_plans_approved_by_users_id_fk 
          FOREIGN KEY (approved_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL;
        END IF;
      END $$
    `)

    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'indicator_plans_indicator_id_indicators_id_fk'
        ) THEN
          ALTER TABLE indicator_plans 
          ADD CONSTRAINT indicator_plans_indicator_id_indicators_id_fk 
          FOREIGN KEY (indicator_id) 
          REFERENCES indicators(id) 
          ON DELETE SET NULL;
        END IF;
      END $$
    `)
    console.log('✓ Added all indicator_plans foreign keys')

    console.log('\n✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

createPlanningTables()
