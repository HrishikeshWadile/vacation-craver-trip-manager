# Trip Management — Auth slice

This is the login/register/admin-gating layer, built against the
folder structure and stack you already laid out (React + TS + Vite,
Tailwind, Supabase, React Hook Form + Zod, react-router).

## What's here

```
supabase/schema.sql          profiles + trips (stub) tables, RLS, storage buckets
src/supabase/client.ts       Supabase client (typed)
src/types/database.ts        hand-written row types (swap for `supabase gen types` later)
src/types/user.ts            form value types
src/context/AuthContext.tsx  session + profile + isAdmin, everywhere via useAuth()
src/services/authService.ts  registerStudent / loginStudent / loginAdmin
src/components/ui/           FormField, SelectField, AuthCard
src/pages/Login/Login.tsx        student login
src/pages/Login/AdminLogin.tsx   admin login (separate screen, verifies role)
src/pages/Register/Register.tsx  4-step signup: account → personal → college → documents
src/routes/ProtectedRoute.tsx    guards student pages, redirects to /login
src/routes/AdminRoute.tsx        guards /admin/*, redirects to /admin/login
src/App.tsx                      routes wired together
```

## Install

```bash
npm install @supabase/supabase-js react-router-dom react-hook-form zod @hookform/resolvers
```

Copy `.env.example` to `.env` and fill in your Supabase project URL + anon key.

## Set up the database

Run `supabase/schema.sql` in the Supabase SQL editor. It creates:

- a `user_role` enum (`student` / `admin`) and `verification_status` enum
- a `trips` stub table (you'll expand this when you build the batches feature)
- a `profiles` table (personal info, college info, storage **paths** for the
  profile photo and ID proof, `id_verification_status`, `current_trip_id`)
- a trigger that auto-creates a bare `profiles` row the moment someone signs up
- RLS so a student can only read/update their own row, and can't self-promote
  to `admin` or self-verify their own ID
- two private storage buckets, `profile-photos` and `id-proofs`, scoped so a
  user can only touch files under their own `user_id/` folder, and admins can
  read everyone's

To create your first admin: sign up normally, then in the SQL editor run
`update public.profiles set role = 'admin' where id = '<their-auth-uid>';`

## How the pieces map to what you described

- **Register** → the 4-step form collects personal info, college info, then
  uploads the profile photo and ID proof to the private buckets. `id_proof` is
  stored as a path only (`profile_photo_path` / `id_proof_path`), never a
  public URL — an admin screen later generates signed URLs to view them.
- **Payments visible/verifiable by admin only** → not built yet, but the
  pattern will match: a `payments` table with a `status` enum
  (`pending`/`verified`/`rejected`), RLS so students only see their own rows
  and only admins can flip `status`, exactly like `id_verification_status` here.
- **`/admin` gating** → `AdminRoute` checks both "is there a session" and
  "does this profile have role = admin". A logged-in *student* hitting
  `/admin/anything` gets bounced to `/admin/login`, same as an anonymous
  visitor — it never leaks that admin pages exist.
- **Room locking (n rooms × m seats, admin-only edit after a deadline)** → not
  built yet; when you get there, enforce the deadline in Postgres (a
  `locks_at timestamptz` column on `trips` + an RLS check / a scheduled
  function), not just in the UI, so a late client request can't sneak past it.
- **Trip "batches"** → `profiles.current_trip_id` already points at `trips`.
  Joining/removing a student from a batch becomes `update profiles set
  current_trip_id = ...`; only admins get an RLS update policy for other
  people's `current_trip_id`.

## Next pieces, in the order they'll unblock each other

1. **Admin: student roster + ID verification** — list `profiles`, show a
   signed URL for the ID proof, buttons to set `id_verification_status`.
2. **Trips/batches** — flesh out the `trips` stub, a join screen for students,
   an admin screen to add/remove students from a batch.
3. **Rooms + room_allocations** — the locking behavior you described (open
   until a deadline, then admin-only) is the trickiest part; happy to build
   that as its own pass once this auth layer is working end-to-end for you.
4. **Payments + installments** — `payments` table with an `installment_no`,
   a view or computed column for "installments remaining", admin verify button.
