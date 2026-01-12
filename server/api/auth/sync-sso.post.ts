import { db } from '../../database'
import { users, employees, sites } from '../../database/schema'
import { eq, sql } from 'drizzle-orm'
import { hash } from 'bcrypt'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { email } = body

        if (!email) {
            setResponseStatus(event, 400)
            return {
                success: false,
                message: 'Email is required'
            }
        }

        // Find user by email (case-insensitive)
        const foundUsers = await db
            .select()
            .from(users)
            .where(sql`lower(${users.email}) = lower(${email})`)
            .limit(1)

        if (foundUsers.length === 0) {
            // Auto-create user
            const dummyPassword = crypto.randomUUID()
            const hashedPassword = await hash(dummyPassword, 10)

            const newUsers = await db.insert(users).values({
                name: body.name || 'SSO User',
                username: email.split('@')[0], // Generate username from email
                email: email,
                password: hashedPassword,
                role: (body.role || 'user').toLowerCase(),
                siteId: body.siteId || null,
                // employeeId will be null initially, administrator can link it later
            }).returning()

            if (newUsers.length > 0) {
                // Return new user with flag to indicate password setup is needed
                return {
                    success: true,
                    data: {
                        id: newUsers[0].id,
                        name: newUsers[0].name,
                        username: newUsers[0].username,
                        email: newUsers[0].email,
                        role: newUsers[0].role,
                        roleId: newUsers[0].role,
                        roleName: newUsers[0].role,
                        employeeId: newUsers[0].employeeId,
                        siteId: newUsers[0].siteId,
                        // Extended fields
                        siteLogo: null,
                        siteName: null,
                        unitId: null,
                        nik: null,
                        // Flag for frontend to redirect to password setup
                        isNewUser: true
                    }
                }
            }

            setResponseStatus(event, 500)
            return {
                success: false,
                message: 'Failed to auto-create user'
            }
        }

        const user = foundUsers[0]

        // Fetch employee's unitId if employeeId exists
        let unitId = null
        let nik = null
        if (user.employeeId) {
            const employee = await db
                .select({
                    unitId: employees.unitId,
                    nik: employees.nik
                })
                .from(employees)
                .where(eq(employees.id, user.employeeId))
                .limit(1)

            if (employee.length > 0) {
                unitId = employee[0].unitId
                nik = employee[0].nik
            }
        }

        // Fetch site info if siteId exists
        let siteLogo = null
        let siteName = null
        if (user.siteId) {
            const site = await db
                .select({
                    siteLogo: sites.siteLogo,
                    name: sites.name
                })
                .from(sites)
                .where(eq(sites.id, user.siteId))
                .limit(1)

            if (site.length > 0) {
                siteLogo = site[0].siteLogo
                siteName = site[0].name
            }
        }

        return {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role.toLowerCase(), // Ensure lowercase for logic checks
                roleId: user.role.toLowerCase(),
                roleName: user.role, // Keep original for display
                employeeId: user.employeeId,
                siteId: user.siteId,
                siteLogo: siteLogo,
                siteName: siteName,
                unitId: unitId,
                nik: nik
            }
        }
    } catch (error: any) {
        console.error('Sync SSO error:', error)
        setResponseStatus(event, 500)
        return {
            success: false,
            message: error.message || 'Failed to sync SSO user'
        }
    }
})
