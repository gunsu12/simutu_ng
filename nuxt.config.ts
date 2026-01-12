// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  runtimeConfig: {
    // Private keys (server-side only)
    sso: {
      clientSecret: process.env.SSO_CLIENT_SECRET,
    },

    // Public keys (available on client-side)
    public: {
      sso: {
        baseUrl: process.env.SSO_BASE_URL || 'https://sso.yourdomain.com',
        clientId: process.env.SSO_CLIENT_ID || '',
        redirectUri: process.env.SSO_REDIRECT_URI || 'http://localhost:3000/auth/callback',
        scopes: ['openid', 'profile', 'email'],
      },
    },
  },

  // Optional: Enable auto-imports
  imports: {
    dirs: ['stores'],
  },

  // Improve performance with page caching
  routeRules: {
    '/dashboard/**': { ssr: false },
    '/login': { ssr: false },
    // Redirects for legacy or root paths
    '/users': { redirect: '/dashboard/master/users' },
    '/employees': { redirect: '/dashboard/master/employee' },
    '/units': { redirect: '/dashboard/master/units' },
    '/sites': { redirect: '/dashboard/master/site' },
  },

  // Security headers
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *; font-src 'self' data:; connect-src 'self' *;"
        }
      }
    }
  },

  app: {
    head: {
      title: 'Simutu NG Dashboard',
      meta: [
        { name: 'description', content: 'Modern dashboard template' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  tailwindcss: {
    configPath: 'tailwind.config.ts'
  },

  // Experimental features for better performance
  experimental: {
    payloadExtraction: false
  }
})