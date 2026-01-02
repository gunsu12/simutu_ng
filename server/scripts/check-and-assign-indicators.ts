import { db } from '../database'
import { units, indicators, indicatorUnits } from '../database/schema'
import { eq, isNull } from 'drizzle-orm'

async function checkAndAssignIndicators() {
  console.log('Checking indicators and units...\n')

  try {
    // 1. Check all units
    console.log('=== Available Units ===')
    const allUnits = await db
      .select()
      .from(units)
      .where(isNull(units.deletedAt))
    
    console.log(`Found ${allUnits.length} units:`)
    allUnits.forEach(unit => {
      console.log(`  - ${unit.unitCode}: ${unit.name} (ID: ${unit.id})`)
    })

    // 2. Check all indicators
    console.log('\n=== Available Indicators ===')
    const allIndicators = await db
      .select()
      .from(indicators)
      .where(isNull(indicators.deletedAt))
    
    console.log(`Found ${allIndicators.length} indicators:`)
    allIndicators.forEach(indicator => {
      console.log(`  - ${indicator.code}: ${indicator.judul}`)
      console.log(`    Frequency: ${indicator.entryFrequency}, Active: ${indicator.isActive}`)
    })

    // 3. Check existing indicator_units assignments
    console.log('\n=== Existing Indicator Assignments ===')
    const existingAssignments = await db
      .select({
        unit: units,
        indicator: indicators,
      })
      .from(indicatorUnits)
      .innerJoin(units, eq(indicatorUnits.unitId, units.id))
      .innerJoin(indicators, eq(indicatorUnits.indicatorId, indicators.id))
    
    if (existingAssignments.length === 0) {
      console.log('No assignments found!')
    } else {
      console.log(`Found ${existingAssignments.length} assignments:`)
      existingAssignments.forEach(({ unit, indicator }) => {
        console.log(`  - ${unit.name} -> ${indicator.code}: ${indicator.judul}`)
      })
    }

    // 4. Assign all indicators to all units (if you want to do this automatically)
    console.log('\n=== Auto-Assignment ===')
    console.log('Do you want to assign all indicators to all units? (Edit this script to enable)')
    
    // Uncomment the code below to auto-assign all indicators to all units
    /*
    for (const unit of allUnits) {
      for (const indicator of allIndicators) {
        // Check if already assigned
        const existing = await db
          .select()
          .from(indicatorUnits)
          .where(
            and(
              eq(indicatorUnits.unitId, unit.id),
              eq(indicatorUnits.indicatorId, indicator.id)
            )
          )
        
        if (existing.length === 0) {
          await db.insert(indicatorUnits).values({
            unitId: unit.id,
            indicatorId: indicator.id,
          })
          console.log(`  ✓ Assigned ${indicator.code} to ${unit.name}`)
        }
      }
    }
    console.log('\nAssignment completed!')
    */

    console.log('\n=== Instructions ===')
    console.log('1. If no indicators exist, create them first in the indicator management page')
    console.log('2. If no units exist, create them first in the unit management page')
    console.log('3. To assign indicators to units, either:')
    console.log('   - Use the indicator management UI to assign units')
    console.log('   - Uncomment the auto-assignment code in this script')
    console.log('   - Manually insert into indicator_units table')

  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

checkAndAssignIndicators()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
