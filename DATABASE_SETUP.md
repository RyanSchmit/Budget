# Database Setup Guide

This guide will help you set up the transactions table in your Supabase database.

## Step 1: Create the Transactions Table

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-migrations/create-transactions-table.sql`
4. Run the SQL script

Alternatively, you can run the SQL directly in the Supabase SQL Editor:

```sql
-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  transact_id UUID PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT USING (true);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE USING (true);
```

## Step 2: Import Existing Transactions (Optional)

If you have existing transactions in `src/app/transactions.ts` that you want to import:

1. Start your development server: `npm run dev`
2. Make a POST request to `/api/import-transactions`:
   - Using curl: `curl -X POST http://localhost:3000/api/import-transactions`
   - Or use a tool like Postman or your browser's fetch console

Alternatively, you can create a temporary page or script to call the import function.

## Step 3: Verify Setup

1. Navigate to the Transactions page in your app
2. You should see transactions loading from the database
3. Try adding a new transaction via CSV upload
4. Try updating a transaction's category
5. Try deleting a transaction

## Environment variables

Add to `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (publishable) key
- `SUPABASE_SERVICE_ROLE_KEY` — **Required for Transactions.** Service role key (Project Settings → API). Used by server-side code to read/write `transactions`; it bypasses Row Level Security (RLS). **Never expose this client-side.**
- `DEFAULT_USER_ID` — Integer user id used for `user_id` when inserting transactions. Use the `id` from your users table (or any integer you use to identify the current user).

## Notes

- The transactions are now stored in Supabase instead of the static file
- All CRUD operations (Create, Read, Update, Delete) are automatically synced with the database
- Date format conversion is handled automatically (MM-DD-YYYY ↔ YYYY-MM-DD)
- The Save button inserts **new** transactions (e.g. from CSV) into the `transactions` table. Fetch, update, and delete filter by `user_id`.

## Troubleshooting

If you encounter issues:

1. **"relation 'transactions' does not exist"**: Make sure you've run the SQL migration
2. **"DEFAULT_USER_ID is not set"**: Add `DEFAULT_USER_ID=<your-user-id>` to `.env.local`
3. **"new row violates row-level security policy"**: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Project Settings → API → `service_role` secret). The app uses it for server-side DB access so inserts bypass RLS.
4. **"null value in column transact_id"**: The app now generates `transact_id` (timestamp-based) when inserting. If you prefer DB-generated IDs, add a default in Supabase SQL Editor: `CREATE SEQUENCE IF NOT EXISTS transactions_transact_id_seq; ALTER TABLE transactions ALTER COLUMN transact_id SET DEFAULT nextval('transactions_transact_id_seq');` then remove `transact_id` from the insert payload in `actions.ts`.
5. **"Missing SUPABASE_SERVICE_ROLE_KEY"**: Same as above; add the service role key to `.env.local`
6. **Permission errors**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set. If you use only the anon key, RLS policies must allow INSERT.
7. **Date format errors**: Verify your dates are in MM-DD-YYYY or YYYY-MM-DD format
8. **Connection errors**: Verify your `.env.local` has the correct Supabase credentials
