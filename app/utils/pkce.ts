/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE() {
    // Generate random code verifier (43-128 characters)
    const codeVerifier = generateRandomString(128)

    // Generate code challenge (SHA-256 hash of verifier)
    const codeChallenge = base64UrlEncode(await sha256(codeVerifier))

    return {
        codeVerifier,
        codeChallenge,
    }
}

export function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    let result = ''
    const values = new Uint8Array(length)
    crypto.getRandomValues(values)

    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length]
    }

    return result
}

async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return await crypto.subtle.digest('SHA-256', data)
}

function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
}
