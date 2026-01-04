# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package files for better caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for build)
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - use distroless-like minimal image
FROM node:20-alpine AS production

WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Only copy the standalone output (Nuxt 3 outputs everything needed)
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nuxtjs

# Start the application
CMD ["node", ".output/server/index.mjs"]
