# Vacation Craver Trip Manager

A React + TypeScript trip-management application for students and administrators. The current implementation focuses on authentication, profile completion, role-based access control, and the foundation for trip management using Supabase.

## Tech stack

- **React 19** with TypeScript
- **Vite** for development and production builds
- **React Router** for client-side routing
- **Supabase** for authentication, PostgreSQL, row-level security, and private storage
- **React Hook Form** and **Zod** for form state and validation
- **Tailwind CSS** for styling
- **jsPDF** for PDF-related functionality
- **Oxlint** for linting

## Current features

### Student experience

- Student registration with a multi-step profile flow
- Student login and session handling
- Profile completion page for authenticated users
- Student dashboard
- Trip details route (`/trip/:tripId`)
- Account settings
- Protected routes that require authentication and a completed profile

### Administrator experience

- Separate administrator login screen
- Role-based admin route protection
- Admin dashboard
- Admin access controlled by the `admin` role in the Supabase profile

### Data and security foundation

- Supabase Auth integration
- `profiles` and `trips` database tables
- Profile creation trigger for newly registered users
- Row-level security policies for user-owned data
- Private storage buckets for profile photos and ID proofs
- File paths stored instead of public file URLs
- Student/admin roles and ID-verification status support

## Application routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Student login |
| `/register` | Public | Student registration |
| `/admin/login` | Public | Administrator login |
| `/complete-profile` | Authenticated | Complete the user profile |
| `/dashboard` | Authenticated + completed profile | Student dashboard |
| `/trip/:tripId` | Authenticated + completed profile | View trip details |
| `/settings` | Authenticated + completed profile | Manage account settings |
| `/admin/dashboard` | Authenticated admin | Administrator dashboard |

Unauthenticated users are redirected to `/login`. Users without the admin role cannot access administrator routes.

## Project structure

```text
.
├── supabase/
│   └── schema.sql                 Database schema, RLS policies, and storage setup
├── src/
│   ├── components/               Shared UI components
│   ├── context/AuthContext.tsx    Authentication and profile context
│   ├── pages/
│   │   ├── Login/                Student and admin login pages
│   │   ├── Register/              Registration flow
│   │   ├── CompleteProfile/       Profile completion
│   │   ├── Dashboard/             Student dashboard and trip details
│   │   ├── Settings/              Account settings
│   │   └── admin/                 Admin dashboard
│   ├── routes/                    Protected and admin route guards
│   ├── services/authService.ts    Authentication service functions
│   ├── supabase/client.ts         Typed Supabase client
│   └── types/                     Application and database types
├── .env.example                   Required environment variable template
├── package.json                   Scripts and dependencies
└── vite.config.ts                 Vite configuration
```

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Copy the environment template:

```bash
cp .env.example .env
```

Set the following values in `.env`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never commit real Supabase credentials or other secrets to the repository.

### 3. Initialize the database

Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. The schema creates:

- `user_role` and `verification_status` enums
- The `profiles` table and profile creation trigger
- A `trips` foundation table
- Row-level security policies
- Private `profile-photos` and `id-proofs` storage buckets
- Storage policies scoped to each user's folder

To promote a registered user to an administrator, run the following in the Supabase SQL Editor after replacing the user ID:

```sql
update public.profiles
set role = 'admin'
where id = '<their-auth-uid>';
```

### 4. Start the development server

```bash
npm run dev
```

Vite will print the local development URL in the terminal.

## Available scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run preview  # Preview the production build locally
npm run lint     # Run Oxlint
```

## Roadmap

The authentication and profile foundation is in place. Planned work includes:

1. Admin student roster and ID verification workflow
2. Trip batches and student enrollment management
3. Room allocation with deadline enforcement in PostgreSQL
4. Payments, installment tracking, and admin verification
5. Generated Supabase database types and expanded automated testing

## Security notes

Authorization must be enforced in Supabase policies as well as in the client-side route guards. In particular, role changes, ID verification, payments, trip membership, and room-lock deadlines should never rely on UI checks alone.

## License

No license has been specified yet.
