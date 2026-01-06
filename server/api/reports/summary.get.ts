import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, indicatorUnits, units } from '../../database/schema'
import { eq, isNull, and, gte, lte, inArray, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
    try {
        const user = event.context.user
        if (!user) {
            throw createError({
                statusCode: 401,
                message: 'Unauthorized',
            })
        }

        const query = getQuery(event)
        const frequency = (query.frequency as string) || 'monthly'
        const period = (query.period as string) // YYYY-MM or YYYY-MM-DD

        if (!period) {
            throw createError({
                statusCode: 400,
                message: 'Period is required',
            })
        }

        // Determine start and end date of period
        let startDate: Date
        let endDate: Date

        if (frequency === 'monthly') {
            const [year, month] = period.split('-').map(Number)
            startDate = new Date(year, month - 1, 1, 0, 0, 0, 0)
            endDate = new Date(year, month, 0, 23, 59, 59, 999)
        } else {
            startDate = new Date(period)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(period)
            endDate.setHours(23, 59, 59, 999)
        }

        // Build unit filter
        const unitConditions = [isNull(units.deletedAt)]

        if (user.role === 'user' && user.unitId) {
            unitConditions.push(eq(units.id, user.unitId))
        } else if (user.role === 'manager' && user.employeeId) {
            unitConditions.push(eq(units.headOfUnit, user.employeeId))
        } else if (user.role === 'auditor' && user.siteId) {
            unitConditions.push(eq(units.siteId, user.siteId))
        }
        // Admin (no extra filter)

        const activeUnits = await db
            .select({
                id: units.id,
                name: units.name,
            })
            .from(units)
            .where(and(...unitConditions))
            .orderBy(units.name)

        if (activeUnits.length === 0) {
            return { success: true, data: [] }
        }

        const unitIds = activeUnits.map(u => u.id)

        // Fetch all indicators assigned to these units with matching frequency
        const assignedIndicators = await db
            .select({
                indicatorId: indicatorUnits.indicatorId,
                unitId: indicatorUnits.unitId,
                target: indicators.target,
                targetKeterangan: indicators.targetKeterangan,
                targetCalculationFormula: indicators.targetCalculationFormula,
            })
            .from(indicatorUnits)
            .innerJoin(indicators, eq(indicatorUnits.indicatorId, indicators.id))
            .where(
                and(
                    inArray(indicatorUnits.unitId, unitIds),
                    eq(indicators.entryFrequency, frequency),
                    eq(indicators.isActive, true),
                    isNull(indicators.deletedAt)
                )
            )

        // Group indicators by unit for counting
        const indicatorsCountByUnit = new Map<string, number>()
        const indicatorsDataByUnit = new Map<string, any[]>()

        assignedIndicators.forEach(ai => {
            indicatorsCountByUnit.set(ai.unitId, (indicatorsCountByUnit.get(ai.unitId) || 0) + 1)
            if (!indicatorsDataByUnit.has(ai.unitId)) {
                indicatorsDataByUnit.set(ai.unitId, [])
            }
            indicatorsDataByUnit.get(ai.unitId)!.push(ai)
        })

        // Fetch all entries for these units and period
        const entries = await db
            .select({
                entry: indicatorEntries,
                item: indicatorEntryItems,
            })
            .from(indicatorEntries)
            .innerJoin(indicatorEntryItems, eq(indicatorEntries.id, indicatorEntryItems.indicatorEntryId))
            .where(
                and(
                    inArray(indicatorEntries.unitId, unitIds),
                    eq(indicatorEntries.entryFrequency, frequency),
                    gte(indicatorEntries.entryDate, startDate),
                    lte(indicatorEntries.entryDate, endDate),
                    isNull(indicatorEntries.deletedAt)
                )
            )

        // Calculate achievement per unit
        const unitSummaries = activeUnits.map(unit => {
            const unitIndicators = indicatorsDataByUnit.get(unit.id) || []
            const totalIndicators = unitIndicators.length

            // Filter entries for this unit
            const unitEntries = entries.filter(e => e.entry.unitId === unit.id)

            let achievedCount = 0

            unitIndicators.forEach(indicator => {
                // Find the entry item for this indicator
                const itemMatch = unitEntries.find(ue => ue.item.indicatorId === indicator.indicatorId)
                if (itemMatch) {
                    const item = itemMatch.item
                    const target = indicator.target ? Number(indicator.target) : null
                    const keterangan = indicator.targetKeterangan || '>='

                    // Use pre-calculated result if available
                    let result = item.numeratorDenominatorResult ? Number(item.numeratorDenominatorResult) : null

                    if (result === null && item.numeratorValue !== null && item.denominatorValue !== null) {
                        const n = Number(item.numeratorValue)
                        const d = Number(item.denominatorValue)
                        if (d !== 0) {
                            const formula = indicator.targetCalculationFormula || '(N/D)*100'
                            if (formula === 'N/D') result = n / d
                            else if (formula === 'N-D') result = n - d
                            else result = (n / d) * 100
                        }
                    }

                    if (result !== null && target !== null) {
                        let achieved = false
                        switch (keterangan) {
                            case '>': achieved = result > target; break
                            case '<': achieved = result < target; break
                            case '=': achieved = result === target; break
                            case '>=': achieved = result >= target; break
                            case '<=': achieved = result <= target; break
                        }
                        if (achieved) achievedCount++
                    }
                }
            })

            return {
                unitId: unit.id,
                unit: unit.name,
                indicators: totalIndicators,
                achieved: achievedCount,
                percentage: totalIndicators > 0 ? Math.round((achievedCount / totalIndicators) * 100) : 0
            }
        })

        return {
            success: true,
            data: unitSummaries
        }
    } catch (error: any) {
        console.error('Summary report error:', error)
        return {
            success: false,
            message: error.message || 'Failed to fetch summary report'
        }
    }
})
