import { Lucia } from 'lucia'
import { PostgresJsAdapter } from '@lucia-auth/adapter-postgresql'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL!
const sql = postgres(connectionString)

const adapter = new PostgresJsAdapter(sql, {
  user: 'users',
  session: 'sessions',
})

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      name: attributes.name,
      username: attributes.username,
      email: attributes.email,
      role: attributes.role,
      employeeId: attributes.employee_id,
      siteId: attributes.site_id,
    }
  },
})

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      name: string
      username: string
      email: string
      role: string
      employee_id: string | null
      site_id: string | null
    }
  }
}
