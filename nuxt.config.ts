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

  // Improve performance with page caching
  routeRules: {
    '/dashboard/**': { ssr: false },
    '/login': { ssr: false }
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