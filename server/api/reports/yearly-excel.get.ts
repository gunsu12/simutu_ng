import { db } from '../../database'
import { indicatorEntries, indicatorEntryItems, indicators, indicatorCategories, indicatorUnits, units } from '../../database/schema'
import { eq, isNull, and, gte, lte, sql } from 'drizzle-orm'
import ExcelJS from 'exceljs'

interface MonthlyResult {
    month: number
    capaian: number | null
    achieved: boolean
}

interface ReportRow {
    no: number
    indicatorId: string
    code: string
    judul: string
    unitId: string
    unitName: string
    target: number | null
    targetKeterangan: string | null
    targetUnit: string | null
    monthlyResults: MonthlyResult[]
}

interface UnitGroup {
    unitId: string
    unitName: string
    indicators: ReportRow[]
    notAchievedCount: number[]
}

export default defineEventHandler(async (event) => {
    try {
        const session = event.context.session
        if (!session) {
            throw createError({
                statusCode: 401,
                message: 'Unauthorized',
            })
        }

        const query = getQuery(event)
        const year = parseInt(query.year as string) || new Date().getFullYear()
        const categoryId = query.categoryId as string | undefined
        const entryFrequency = (query.frequency as string) || 'monthly'

        // Build date range
        const startDate = new Date(year, 0, 1)
        const endDate = new Date(year, 11, 31, 23, 59, 59)

        // Build indicator filter conditions
        const indicatorConditions = [
            isNull(indicators.deletedAt),
            eq(indicators.isActive, true),
            eq(indicators.entryFrequency, entryFrequency),
        ]

        if (categoryId) {
            indicatorConditions.push(eq(indicators.indicatorCategoryId, categoryId))
        }

        // Get indicators with units
        const indicatorsWithUnits = await db
            .select({
                indicator: indicators,
                unitId: indicatorUnits.unitId,
                unitName: units.name,
            })
            .from(indicators)
            .innerJoin(indicatorUnits, eq(indicators.id, indicatorUnits.indicatorId))
            .innerJoin(units, eq(indicatorUnits.unitId, units.id))
            .where(and(...indicatorConditions))

        // Fetch entries
        const entries = await db
            .select({
                entry: indicatorEntries,
                item: indicatorEntryItems,
                indicator: indicators,
            })
            .from(indicatorEntries)
            .innerJoin(indicatorEntryItems, eq(indicatorEntries.id, indicatorEntryItems.indicatorEntryId))
            .innerJoin(indicators, eq(indicatorEntryItems.indicatorId, indicators.id))
            .where(
                and(
                    eq(indicatorEntries.entryFrequency, entryFrequency),
                    gte(indicatorEntries.entryDate, startDate),
                    lte(indicatorEntries.entryDate, endDate),
                    isNull(indicatorEntries.deletedAt)
                )
            )

        const resultsMap = new Map<string, any>()
        for (const { entry, item, indicator } of entries) {
            const month = new Date(entry.entryDate).getMonth() + 1
            const key = `${indicator.id}_${entry.unitId}_${month}`

            let capaian: number | null = null
            const numerator = item.numeratorValue ? Number(item.numeratorValue) : null
            const denominator = item.denominatorValue ? Number(item.denominatorValue) : null

            if (numerator !== null && denominator !== null && denominator !== 0) {
                const formula = indicator.targetCalculationFormula || '(N/D)*100'
                switch (formula) {
                    case 'N/D': capaian = numerator / denominator; break
                    case 'N-D': capaian = numerator - denominator; break
                    case '(N/D)*100':
                    default: capaian = (numerator / denominator) * 100; break
                }
            }

            resultsMap.set(key, {
                capaian: item.numeratorDenominatorResult ? Number(item.numeratorDenominatorResult) : capaian
            })
        }

        const unitGroupsMap = new Map<string, UnitGroup>()
        let globalNo = 0

        for (const { indicator, unitId, unitName } of indicatorsWithUnits) {
            if (!unitGroupsMap.has(unitId)) {
                unitGroupsMap.set(unitId, {
                    unitId, unitName, indicators: [], notAchievedCount: Array(12).fill(0)
                })
            }
            const unitGroup = unitGroupsMap.get(unitId)!
            globalNo++

            const monthlyResults: MonthlyResult[] = []
            const target = indicator.target ? Number(indicator.target) : null
            const targetKeterangan = indicator.targetKeterangan || '>='

            for (let month = 1; month <= 12; month++) {
                const key = `${indicator.id}_${unitId}_${month}`
                const result = resultsMap.get(key)
                const capaian = result?.capaian ?? null
                let achieved = false

                if (capaian !== null && target !== null) {
                    switch (targetKeterangan) {
                        case '>': achieved = capaian > target; break
                        case '<': achieved = capaian < target; break
                        case '=': achieved = capaian === target; break
                        case '>=': achieved = capaian >= target; break
                        case '<=': achieved = capaian <= target; break
                    }
                    if (!achieved) unitGroup.notAchievedCount[month - 1]++
                }
                monthlyResults.push({ month, capaian, achieved })
            }

            unitGroup.indicators.push({
                no: globalNo, indicatorId: indicator.id, code: indicator.code, judul: indicator.judul,
                unitId, unitName, target, targetKeterangan: indicator.targetKeterangan,
                targetUnit: indicator.targetUnit, monthlyResults
            })
        }

        const sortedUnitGroups = Array.from(unitGroupsMap.values())
            .sort((a, b) => a.unitName.localeCompare(b.unitName))

        // Excel Generation
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Laporan Tahunan')

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

        // Formatting helpers
        const formatTargetStr = (row: ReportRow) => {
            if (row.target === null) return '-'
            const ket = row.targetKeterangan || '>='
            const unit = row.targetUnit === 'percentage' ? '%' : ''
            return `${ket}${row.target}${unit}`
        }

        // Title
        worksheet.mergeCells('A1:P1')
        const titleCell = worksheet.getCell('A1')
        titleCell.value = `JANUARI - DESEMBER TAHUN ${year}`
        titleCell.font = { bold: true, size: 14 }
        titleCell.alignment = { horizontal: 'center' }

        // Headers
        const headerRow = worksheet.addRow([
            'NO', 'JUDUL INDIKATOR MUTU', 'UNIT/PIC', 'Target', ...months
        ])

        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            }
            cell.font = { bold: true }
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })

        // Data Rows
        sortedUnitGroups.forEach(group => {
            group.indicators.forEach(row => {
                const dataRow = worksheet.addRow([
                    row.no,
                    row.judul,
                    row.unitName,
                    formatTargetStr(row),
                    ...row.monthlyResults.map(r => r.capaian)
                ])

                dataRow.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    }

                    // Numeric formatting for monthly results
                    if (colNumber > 4) {
                        const res = row.monthlyResults[colNumber - 5]
                        if (res.capaian !== null) {
                            // Apply Number Formatting
                            if (row.targetUnit === 'percentage') {
                                cell.numFmt = '0.00"%"'
                            } else if (row.targetUnit === 'day') {
                                cell.numFmt = '0.00" hari"'
                            } else {
                                cell.numFmt = '0.00'
                            }

                            cell.font = {
                                color: { argb: res.achieved ? 'FF16A34A' : 'FFDC2626' },
                                bold: !res.achieved
                            }
                        } else {
                            cell.value = '-'
                            cell.alignment = { horizontal: 'center' }
                        }
                    }
                })
            })

            // Summary Row
            const summaryRow = worksheet.addRow([
                '',
                'Indikator tidak mencapai target',
                '',
                '',
                ...group.notAchievedCount.map(count => count > 0 ? count : '-')
            ])

            summaryRow.eachCell((cell, colNumber) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F5F5' }
                }
                cell.font = { bold: true }
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                }
                if (colNumber > 4) {
                    const count = group.notAchievedCount[colNumber - 5]
                    if (count > 0) {
                        cell.font = { color: { argb: 'FFDC2626' }, bold: true }
                    }
                    cell.alignment = { horizontal: 'center' }
                }
            })

            // Empty row
            worksheet.addRow([])
        })

        // Column Widths
        worksheet.getColumn(1).width = 5
        worksheet.getColumn(2).width = 50
        worksheet.getColumn(3).width = 25
        worksheet.getColumn(4).width = 15
        for (let i = 5; i <= 16; i++) {
            worksheet.getColumn(i).width = 10
        }

        // Response
        const buffer = await workbook.xlsx.writeBuffer()

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        setResponseHeaders(event, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Laporan_Mutu_Tahunan_${year}_${timestamp}.xlsx"`,
            'Cache-Control': 'no-cache',
        })

        return buffer
    } catch (error: any) {
        console.error('Export Excel error:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Gagal membuat file Excel',
        })
    }
})
