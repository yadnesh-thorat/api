# Build stage for Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Build stage for Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
# Copy frontend build to backend/public (as configured in vite.config.js usually outDir is ../backend/public)
# But we do it explicitly to be safe
COPY --from=frontend-builder /app/backend/public ./public
RUN npm run build

# Final Production Stage
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/public ./public

EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
