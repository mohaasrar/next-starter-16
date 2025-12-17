# Next.js Full-Stack Starter Kit

A production-ready, opinionated Next.js starter kit with a comprehensive tech stack.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **API**: Hono (Edge or Node)
- **Auth**: Better Auth
- **Authorization**: CASL
- **DB ORM**: Prisma
- **Database**: PostgreSQL
- **Data Fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack React Table
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Env**: @t3-oss/env-nextjs
- **Logging**: Pino
- **Testing**: Vitest + Playwright

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secret key for Better Auth
- `BETTER_AUTH_URL`: Base URL for your app (optional)

### 3. Set Up Database

Run database migrations:

```bash
npm run db:generate
npm run db:push
```

Or use Prisma Studio to manage your database:

```bash
npm run db:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├─ app/
│  ├─ (auth)/          # Auth routes (login, register)
│  ├─ (dashboard)/      # Protected dashboard routes
│  └─ api/             # API routes (Hono)
├─ components/
│  ├─ ui/              # shadcn/ui components
│  ├─ forms/           # Form components
│  └─ tables/          # Table components
├─ features/
│  └─ users/           # Feature modules (domain-driven)
├─ server/
│  ├─ api/             # Hono API routes
│  ├─ auth/            # Auth configuration
│  ├─ db/              # Database schema & client
│  └─ middleware/      # Server middleware
├─ lib/                # Shared utilities
└─ styles/             # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests (Vitest)
- `npm run test:e2e` - Run E2E tests (Playwright)
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

## Features

- ✅ Authentication with Better Auth
- ✅ Authorization with CASL
- ✅ CRUD operations with Hono API
- ✅ Data fetching with React Query
- ✅ Form validation with React Hook Form + Zod
- ✅ Data tables with React Table
- ✅ Modern UI with shadcn/ui
- ✅ Type-safe environment variables
- ✅ Database migrations with Prisma
- ✅ Logging with Pino
- ✅ Testing setup (Vitest + Playwright)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Hono Documentation](https://hono.dev)
- [Better Auth Documentation](https://www.better-auth.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Query Documentation](https://tanstack.com/query)
- [shadcn/ui Documentation](https://ui.shadcn.com)
# next-starter-16
