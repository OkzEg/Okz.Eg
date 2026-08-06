FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "index.js"]
