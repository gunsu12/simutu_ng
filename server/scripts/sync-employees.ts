import { db } from '../database'
import { sites, divisions, units, employees } from '../database/schema'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config()

const API_URL = 'http://localhost/bros_hrs/public/api/sync/employees'
const API_KEY = 'sk_NTI3OTU2ODY5NjU3YjZlMzQ5ZjEyNTA1ZjFlMDIwNGYwNjBkZDUzMzEyNTIxYzNmOWM3NTMxNGY3ZGQ5ZjYxNg=='

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

async function syncData() {
    console.log('🚀 Starting sync from external API...')

    try {
        const response = await fetch(API_URL, {
            headers: {
                'x-api-key': API_KEY,
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json() as EmployeeSyncData[]
        console.log(`📦 Received ${data.length} records from API`)

        // Use maps to cache IDs and avoid unnecessary lookups
        const siteMap = new Map<string, string>()
        const divisionMap = new Map<string, string>()
        const unitMap = new Map<string, string>()
        const unitHeadNikMap = new Map<string, string>() // unit_code -> unit_head_nik
        const divisionHeadNikMap = new Map<string, string>() // division_code -> division_head_nik

        for (const item of data) {
            // 1. Sync Site
            let siteId = siteMap.get(item.site_code)
            if (!siteId) {
                const [site] = await db.insert(sites)
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
                const [division] = await db.insert(divisions)
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
                const [unit] = await db.insert(units)
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

            // Store unit head info for second pass
            if (item.unit_head_kode) {
                unitHeadNikMap.set(item.unit_code, item.unit_head_kode)
            }

            // Store division head info for second pass
            if (item.division_head_kode) {
                divisionHeadNikMap.set(item.division_code, item.division_head_kode)
            }

            // 4. Sync Employee
            await db.insert(employees)
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
        }

        console.log('🔄 Updating Unit Heads and Division Managers...')
        // Second pass: Link Unit Heads
        for (const [unitCode, headNik] of unitHeadNikMap.entries()) {
            const [headEmployee] = await db.select()
                .from(employees)
                .where(eq(employees.nik, headNik))
                .limit(1)

            if (headEmployee) {
                await db.update(units)
                    .set({ headOfUnit: headEmployee.id })
                    .where(eq(units.unitCode, unitCode))
            }
        }

        // Link Division Heads
        for (const [divisionCode, headNik] of divisionHeadNikMap.entries()) {
            const [headEmployee] = await db.select()
                .from(employees)
                .where(eq(employees.nik, headNik))
                .limit(1)

            if (headEmployee) {
                await db.update(divisions)
                    .set({ managerId: headEmployee.id })
                    .where(eq(divisions.code, divisionCode))
            }
        }

        console.log('✅ Sync completed successfully!')
    } catch (error) {
        console.error('❌ Sync failed:', error)
        if (error instanceof Error) {
            console.error('Error details:', error.message)
        }
    } finally {
        process.exit(0)
    }
}

syncData()
