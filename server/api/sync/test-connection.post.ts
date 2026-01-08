import { defineEventHandler, readBody, createError } from 'h3'
import mysql from 'mysql2/promise'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { host, port, user, password, database } = body

    if (!host || !user) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Host and User are required',
        })
    }

    let connection
    try {
        connection = await mysql.createConnection({
            host,
            port: Number(port) || 3306,
            user,
            password: password || '',
            database: database || undefined, // Database is optional for just testing connection, but good to check if provided
        })

        // Simple ping
        await connection.ping()

        return {
            success: true,
            message: 'Connection successful',
        }
    } catch (err: any) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Connection failed: ' + err.message,
        })
    } finally {
        if (connection) await connection.end()
    }
})
