# Zeona Sanctuary — Production Supabase Database Setup & Recovery Guide

**Target Project**: `zeona-new`  
**Reference ID**: `hjfzbdyowrjxxdytdsnl`  
**Target Branch**: `main` (PRODUCTION)  
**Supabase URL**: `https://hjfzbdyowrjxxdytdsnl.supabase.co`  
**Migration File**: [`supabase/migrations/20261018000001_create_zeona_schema.sql`](file:///Users/mahathimuthukkumar/Desktop/myapp/supabase/migrations/20261018000001_create_zeona_schema.sql)

---

## 1. Preflight Verification Checklist

Before executing any migration in production:

1. **Verify Target Environment**:
   Confirm that your CLI or Dashboard session is connected to project `hjfzbdyowrjxxdytdsnl` on the `main` branch.
2. **Verify Zero Active Data Conflicts**:
   Verify that tables contain no orphaned or unassigned records that would fail foreign key or `NOT NULL` constraints.
3. **Verify Service Role Key Protection**:
   Ensure `service_role` keys are NOT present in client code, `.env`, or repository files. The client must strictly use the public `anon` key.
4. **Inspect Active Policies**:
   Verify that any legacy permissive policies (e.g. `Users own ...`) will be dropped so that multiple policies do not combine with `OR` to create security holes.

---

## 2. Architecture & Security Invariants

- **User Sovereignty**: Every personal record references `auth.users(id) ON DELETE CASCADE`.
- **Double-Ownership on Habit Completions**: `habit_completions` requires `auth.uid() = user_id AND EXISTS (SELECT 1 FROM habits WHERE id = habit_id AND user_id = auth.uid())`. A user cannot register check-ins on another user's habits.
- **Security-Invoker Views**: `habit_logs` is created `WITH (security_invoker = true)` so it executes under the invoking user's session and inherits all underlying RLS constraints.
- **Storage Isolation**: Audio recordings and memory images are placed in private buckets (`public = false`) and isolated by folder prefix `(storage.foldername(name))[1] = auth.uid()::text`.
- **Automated Timestamp Triggers**: Every table with `updated_at` attaches `BEFORE UPDATE EXECUTE FUNCTION public.handle_updated_at()`.

---

## 3. Step-by-Step Execution Guide

### Option A: Supabase Dashboard SQL Editor (Recommended)
1. Open the project dashboard at `https://supabase.com/dashboard/project/hjfzbdyowrjxxdytdsnl/sql/new`.
2. Open [`supabase/migrations/20261018000001_create_zeona_schema.sql`](file:///Users/mahathimuthukkumar/Desktop/myapp/supabase/migrations/20261018000001_create_zeona_schema.sql).
3. Copy the entire file contents and paste into the SQL editor.
4. Click **Run**.
5. Verify green indicator: `Success. No rows returned`.

### Option B: Supabase CLI
```bash
# Link project
npx supabase link --project-ref hjfzbdyowrjxxdytdsnl

# Push migration safely
npx supabase db push
```

---

## 4. Post-Migration Verification & Security Audit

Immediately following execution, run the automated security verification script:

```bash
node scripts/test_user_isolation.js
```

This script verifies:
1. User A can create and read their own records across all tables.
2. User B receives 0 rows when attempting to SELECT User A's records.
3. User B is blocked when attempting to UPDATE User A's records.
4. User B is blocked when attempting to DELETE User A's records.
5. User B is blocked when attempting to forge an INSERT with User A's `user_id`.
6. User B is blocked when attempting to log a habit completion on User A's `habit_id`.
7. Duplicate habit check-in for the same habit and date is rejected by `UNIQUE(habit_id, completed_date)`.

---

## 5. Rollback & Recovery Plan

Because the migration is strictly **non-destructive** (uses `ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`), no existing tables or data are destroyed.

If an unexpected policy or schema issue occurs:

1. **Reverting a Specific Policy**:
   ```sql
   DROP POLICY IF EXISTS "<policy_name>" ON public.<table_name>;
   ```
2. **Reverting the View**:
   ```sql
   DROP VIEW IF EXISTS public.habit_logs;
   ```
3. **Point-in-Time Recovery (PITR)**:
   In Supabase Dashboard -> Project Settings -> Database -> Backups, you can restore from a point-in-time snapshot or download a full logical dump.
