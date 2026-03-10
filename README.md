This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

<<<<<<< HEAD
First, run the development server:
=======
- landing page na rota `/` focada em login
- SSO via Auth0
- login local com email e senha
- persistencia em PostgreSQL via Prisma
- dashboard protegido com cards para Cofre de Senhas, Suporte/Tickets e Grafana

## Stack

- Next.js 16 + App Router
- Auth.js (NextAuth v5 beta)
- Prisma + PostgreSQL
- bcryptjs para senha local

## Configuracao

1. Instale dependencias:

```bash
npm install
```

2. Copie o exemplo de ambiente:

```bash
cp .env.example .env
```

3. Ajuste as variaveis:

- `DATABASE_URL`: conexao com PostgreSQL
- `AUTH_SECRET`: segredo do Auth.js
- `PASSWORD_ENCRYPTION_SECRET`: chave dedicada para criptografia do modulo de senhas
- `AUTH_AUTH0_ID`, `AUTH_AUTH0_SECRET`, `AUTH_AUTH0_ISSUER`: dados do Auth0 para SSO

As configuracoes abaixo ja podem ser gerenciadas pela plataforma no painel `Configuracoes`, com
fallback para ambiente quando ainda nao estiverem salvas no banco:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_GRAFANA_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

As configuracoes abaixo continuam obrigatoriamente fora da plataforma:

- `DATABASE_URL`
- `AUTH_SECRET`
- `PASSWORD_ENCRYPTION_SECRET`
- `AUTH_AUTH0_SECRET`

Como obter/gerar:

- `DATABASE_URL`: vem do seu provedor PostgreSQL, container local ou banco gerenciado.
- `AUTH_SECRET`: gere com `openssl rand -base64 32`.
- `PASSWORD_ENCRYPTION_SECRET`: gere outro valor separado com `openssl rand -base64 32`.
- `AUTH_AUTH0_SECRET`: pegue no painel do Auth0, dentro da aplicacao cadastrada para SSO.

4. Gere o banco:

```bash
npm run db:push
```

5. Opcional: crie um usuario demo local:

```bash
export DEMO_USER_EMAIL=admin@greenew.local
export DEMO_USER_PASSWORD=Admin1234!
npm run db:seed
```

6. Rode a aplicacao:
>>>>>>> f527366 (255)

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
