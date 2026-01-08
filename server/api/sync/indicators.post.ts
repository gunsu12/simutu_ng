import { defineEventHandler, readBody, createError } from 'h3'
import mysql from 'mysql2/promise'
import { eq, and } from 'drizzle-orm'
import { db } from '../../database'
import { indicators, sites, indicatorCategories } from '../../database/schema'

interface MySqlIndicatorRow {
    ind_kode: string
    ind_judul: string
    ind_dimensi_mutu: string
    ind_tujuan: string
    ind_def_opr: string
    ind_formula: string
    ind_numerator: string
    ind_denominator: string
    ind_target: string | number
    ind_bobot: string | number
    ind_target_sat: string
    ind_target_ket: number
    ind_target_empty: number
    ind_target_rumus: number
    ind_type: number
    ind_status: number
    ind_kategori?: number | string
}

interface MySqlCategoryRow {
    ind_kat_id: number | string
    ind_kat_nama: string
    ind_kat_description?: string
    is_hide: number
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { host, port, user, password, database, siteId: requestedSiteId } = body

    if (!host || !user || !database) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Host, User, and Database are required',
        })
    }

    // 1. Establish MySQL Connection
    let connection
    try {
        connection = await mysql.createConnection({
            host,
            port: Number(port) || 3306,
            user,
            password: password || '',
            database,
        })
    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to connect to MySQL: ' + err.message,
        })
    }

    try {
        // 2. Prepare Context (Site & Fallback Category)
        let siteId = requestedSiteId

        // Use provided siteId or fallback to first found site
        if (!siteId) {
            const siteList = await db.select().from(sites).limit(1)
            siteId = siteList[0]?.id
        }

        if (!siteId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No Site ID provided and no sites found in system.',
            })
        }

        // Get or Create "Migrasi" Category (Fallback)
        let fallbackCategoryId: string
        const fallbackCatList = await db.select().from(indicatorCategories)
            .where(
                and(
                    eq(indicatorCategories.name, 'Migrasi'),
                    eq(indicatorCategories.siteId, siteId)
                )
            ).limit(1)

        if (fallbackCatList.length > 0) {
            fallbackCategoryId = fallbackCatList[0].id
        } else {
            const [newCat] = await db.insert(indicatorCategories).values({
                siteId: siteId,
                name: 'Migrasi',
                description: 'Kategori default untuk indikator hasil migrasi yang tidak memiliki kategori',
            }).returning()
            fallbackCategoryId = newCat.id
        }

        // 3. Sync Categories
        const categoryMap = new Map<string, string>() // Old ID -> New UUID
        let catInserted = 0
        let catUpdated = 0

        const [catRows] = await connection.execute<any[]>(
            'SELECT * FROM tb_indikator_kat WHERE isHide = 0'
        )
        const sourceCategories = catRows as MySqlCategoryRow[]

        for (const catRow of sourceCategories) {
            const catName = catRow.ind_kat_nama
            // Robust check for duplicate names within the same site
            const existingCat = await db.select().from(indicatorCategories)
                .where(
                    and(
                        eq(indicatorCategories.name, catName),
                        eq(indicatorCategories.siteId, siteId)
                    )
                ).limit(1)

            let finalCatId = ''

            if (existingCat.length > 0) {
                // Update description if needed (optional, simplistic update here)
                await db.update(indicatorCategories)
                    .set({
                        description: catRow.ind_kat_description,
                        updatedAt: new Date()
                    })
                    .where(eq(indicatorCategories.id, existingCat[0].id))
                finalCatId = existingCat[0].id
                catUpdated++
            } else {
                // Insert
                const [insertedCat] = await db.insert(indicatorCategories).values({
                    siteId: siteId,
                    name: catName,
                    description: catRow.ind_kat_description,
                }).returning()
                finalCatId = insertedCat.id
                catInserted++
            }

            // Map old ID to new UUID
            categoryMap.set(String(catRow.ind_kat_id), finalCatId)
        }

        // 4. Query MySQL Indicators
        const [rows] = await connection.execute<any[]>(
            'SELECT * FROM tb_indikator WHERE ind_type = 2 AND ind_status = 1'
        )

        const sourceData = rows as MySqlIndicatorRow[]
        let processedCount = 0
        let insertedCount = 0
        let updatedCount = 0

        // 5. Transform and Upsert Indicators
        const unitMap: Record<string, string> = {
            '%': 'percentage',
            'hari': 'day',
            'kejadian': 'kejadian',
            'tindakan': 'tindakan',
            'juta': 'juta',
            'miliar': 'miliar',
            'pasien': 'pasien'
        };

        for (const row of sourceData) {
            processedCount++

            // Determine Category
            let targetCategoryId = fallbackCategoryId
            if (row.ind_kategori && categoryMap.has(String(row.ind_kategori))) {
                targetCategoryId = categoryMap.get(String(row.ind_kategori))!
            }

            // Transform target_keterangan
            let targetKeterangan = '='
            switch (Number(row.ind_target_ket)) {
                case 1: targetKeterangan = '='; break;
                case 2: targetKeterangan = '>'; break;
                case 3: targetKeterangan = '<'; break;
                case 4: targetKeterangan = '>='; break;
                case 5: targetKeterangan = '<='; break;
                default: targetKeterangan = '=';
            }

            // Transform target_calculation_formula
            let targetCalculationFormula = '(N/D)*100' // Default / 1 (else)
            const rumusCode = Number(row.ind_target_rumus)
            if (rumusCode === 3) {
                targetCalculationFormula = 'N-D'
            } else if (rumusCode === 2) {
                targetCalculationFormula = 'N/D'
            }

            // targetIsZero
            const targetIsZero = Number(row.ind_target_empty) === 1

            // target unit conversion
            const targetUnitConversion = unitMap[row.ind_target_sat] || '-';

            const indicatorData = {
                siteId: siteId,
                indicatorCategoryId: targetCategoryId,
                code: row.ind_kode,
                judul: row.ind_judul,
                dimensiMutu: row.ind_dimensi_mutu,
                tujuan: row.ind_tujuan,
                definisiOperasional: row.ind_def_opr,
                formula: row.ind_formula,
                numerator: row.ind_numerator,
                denominator: row.ind_denominator,
                target: String(row.ind_target),
                targetWeight: String(row.ind_bobot),
                targetUnit: targetUnitConversion,
                targetKeterangan: targetKeterangan,
                targetIsZero: targetIsZero,
                targetCalculationFormula: targetCalculationFormula,
                entryFrequency: 'monthly', // Default
                isActive: true, // Default
                updatedAt: new Date()
            }

            // Upsert based on code
            // Check if exists
            const existing = await db.select().from(indicators).where(eq(indicators.code, row.ind_kode)).limit(1)

            if (existing.length > 0) {
                // Update
                await db.update(indicators)
                    .set(indicatorData)
                    .where(eq(indicators.id, existing[0].id))
                updatedCount++
            } else {
                // Insert
                await db.insert(indicators).values(indicatorData)
                insertedCount++
            }
        }

        return {
            success: true,
            message: 'Migration completed successfully',
            stats: {
                totalFromSource: processedCount,
                inserted: insertedCount,
                updated: updatedCount,
                categoriesSynced: catInserted + catUpdated
            }
        }

    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Migration process failed: ' + err.message
        })
    } finally {
        if (connection) await connection.end()
    }
})
