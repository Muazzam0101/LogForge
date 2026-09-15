# Next.js Production Dockerfile for LogForge Frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build arguments and environment variables
ARG NEXT_PUBLIC_ULPF_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_ULPF_API_URL=$NEXT_PUBLIC_ULPF_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build production bundle
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ARG NEXT_PUBLIC_ULPF_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_ULPF_API_URL=$NEXT_PUBLIC_ULPF_API_URL

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy artifacts from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
