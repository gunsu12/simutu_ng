import { db } from '../../database'
import { sites, divisions, units, employees } from '../../database/schema'
import { eq } from 'drizzle-orm'

interface EmployeeSyncData {
    pin: string
    nik: string
    full_name: string
    email: string | null
    identity_number: string | null
    phone_number: string | null
    division_name: string
    division_code: string
    unit_name: string
    unit_code: string
    site_code: string
    site_name: string
    site_address?: string | null
    site_email?: string | null
    site_website?: string | null
    site_phone?: string | null
    unit_head_kode?: string | null
    unit_head_name?: string | null
    division_head_kode?: string | null
    division_head_name?: string | null
}

export default defineEventHandler(async (event) => {
    // 1. Validation: Only admin can access
    const user = event.context.user
    if (!user || user.role !== 'admin') {
        throw createError({
            statusCode: 403,
            message: 'Unauthorized: Only admins can perform synchronization'
        })
    }

    // 2. Parse Body
    const body = await readBody(event)
    const { url, apiKey } = body

    if (!url || !apiKey) {
        throw createError({
            statusCode: 400,
            message: 'Missing URL or API Key'
        })
    }

    // 3. Perform Sync
    try {
        console.log(`🚀 Starting sync from external API: ${url} ...`)
        const response = await fetch(url, {
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`External API responded with status: ${response.status}`)
        }

        const data = await response.json() as EmployeeSyncData[]
        console.log(`📦 Received ${data.length} records from API`)

        // Use maps to cache IDs
        const siteMap = new Map<string, string>()
        const divisionMap = new Map<string, string>()
        const unitMap = new Map<string, string>()
        const unitHeadNikMap = new Map<string, string>()
        const divisionHeadNikMap = new Map<string, string>()

        let processedCount = 0

        // Transaction is safer for bulk updates, but might timeout if too large.
        // Given ~1000 records, it should be fine.
        await db.transaction(async (tx) => {
            for (const item of data) {
                // 1. Sync Site
                let siteId = siteMap.get(item.site_code)
                if (!siteId) {
                    const [site] = await tx.insert(sites)
                        .values({
                            siteCode: item.site_code,
                            name: item.site_name,
                            address: item.site_address,
                            email: item.site_email,
                            website: item.site_website,
                            phone: item.site_phone,
                        })
                        .onConflictDoUpdate({
                            target: sites.siteCode,
                            set: {
                                name: item.site_name,
                                address: item.site_address,
                                email: item.site_email,
                                website: item.site_website,
                                phone: item.site_phone,
                                updatedAt: new Date()
                            }
                        })
                        .returning({ id: sites.id })

                    siteId = site.id
                    siteMap.set(item.site_code, siteId)
                }

                // 2. Sync Division
                let divisionId = divisionMap.get(item.division_code)
                if (!divisionId) {
                    const [division] = await tx.insert(divisions)
                        .values({
                            siteId: siteId,
                            code: item.division_code,
                            name: item.division_name,
                        })
                        .onConflictDoUpdate({
                            target: divisions.code,
                            set: {
                                name: item.division_name,
                                siteId: siteId,
                                updatedAt: new Date()
                            }
                        })
                        .returning({ id: divisions.id })

                    divisionId = division.id
                    divisionMap.set(item.division_code, divisionId)
                }

                // 3. Sync Unit
                let unitId = unitMap.get(item.unit_code)
                if (!unitId) {
                    const [unit] = await tx.insert(units)
                        .values({
                            siteId: siteId,
                            divisionId: divisionId,
                            unitCode: item.unit_code,
                            name: item.unit_name,
                        })
                        .onConflictDoUpdate({
                            target: units.unitCode,
                            set: {
                                name: item.unit_name,
                                divisionId: divisionId,
                                siteId: siteId,
                                updatedAt: new Date()
                            }
                        })
                        .returning({ id: units.id })

                    unitId = unit.id
                    unitMap.set(item.unit_code, unitId)
                }

                // Store unit head info
                if (item.unit_head_kode) {
                    unitHeadNikMap.set(item.unit_code, item.unit_head_kode)
                }

                // Store division head info
                if (item.division_head_kode) {
                    divisionHeadNikMap.set(item.division_code, item.division_head_kode)
                }

                // 4. Sync Employee
                await tx.insert(employees)
                    .values({
                        siteId: siteId,
                        unitId: unitId,
                        nik: item.nik,
                        fullName: item.full_name,
                        identityNumber: item.identity_number,
                        phoneNumber: item.phone_number,
                    })
                    .onConflictDoUpdate({
                        target: employees.nik,
                        set: {
                            fullName: item.full_name,
                            unitId: unitId,
                            siteId: siteId,
                            identityNumber: item.identity_number,
                            phoneNumber: item.phone_number,
                            updatedAt: new Date(),
                        }
                    })

                processedCount++
            }

            // Second pass: Unit Heads and Division Managers
            for (const [unitCode, headNik] of unitHeadNikMap.entries()) {
                const [headEmployee] = await tx.select()
                    .from(employees)
                    .where(eq(employees.nik, headNik))
                    .limit(1)

                if (headEmployee) {
                    await tx.update(units)
                        .set({ headOfUnit: headEmployee.id })
                        .where(eq(units.unitCode, unitCode))
                }
            }

            for (const [divisionCode, headNik] of divisionHeadNikMap.entries()) {
                const [headEmployee] = await tx.select()
                    .from(employees)
                    .where(eq(employees.nik, headNik))
                    .limit(1)

                if (headEmployee) {
                    await tx.update(divisions)
                        .set({ managerId: headEmployee.id })
                        .where(eq(divisions.code, divisionCode))
                }
            }
        })

        return {
            success: true,
            message: `Successfully synced ${processedCount} records.`,
            stats: {
                processed: processedCount,
                sites: siteMap.size,
                divisions: divisionMap.size,
                units: unitMap.size
            }
        }

    } catch (error: any) {
        console.error('❌ Sync API failed:', error)
        throw createError({
            statusCode: 500,
            message: error.message || 'Internal Server Error during sync'
        })
    }
})
