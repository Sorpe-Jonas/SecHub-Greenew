FROM node:20-alpine

WORKDIR /src

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .

RUN npm run build
RUN mkdir -p .next/standalone/.next/static
RUN cp -R .next/static/. .next/standalone/.next/static
RUN cp -R public .next/standalone/public

EXPOSE 3000

CMD ["node", "/src/.next/standalone/server.js"]
