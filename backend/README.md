# Budget Backend

Express.js REST API backed by a local PostgreSQL database, for managing
personal transactions and net-worth snapshots.

## Setup

Requires a running PostgreSQL server (`brew services start postgresql@14`).

```bash
cp .env.example .env   # set DATABASE_URL and LOCAL_USER_ID
npm install
npm run db:create      # createdb budget
npm run db:init        # apply schema/init.sql
npm start              # or `npm run dev` for watch mode
```

`schema/init.sql` is the single source of truth for the schema and is
idempotent, so re-running `db:init` against an existing database is safe.

## Authentication

There is none. The app runs single-user: `middleware/localUser.js` stamps
every `/api` request with `LOCAL_USER_ID` instead of decoding a token, and
each table keeps its `user_id` column so the rows carried over from the
previous hosted setup remain addressable.

`LOCAL_USER_ID` must match the `user_id` already on those rows — point it at
a different id and the existing data becomes invisible to the API.

## Migrating data from the old hosted database

`scripts/migrate-from-supabase.js` copies every table over the REST API and
is idempotent (`ON CONFLICT DO NOTHING`), so it can be re-run safely. It needs
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the environment; both
were removed from `.env` once the migration completed.

```bash
npm run db:migrate-from-supabase              # add rows that aren't present
npm run db:migrate-from-supabase -- --truncate  # wipe local tables first
```

---

## API Endpoints

No `Authorization` header is required.

### Health Check

```bash
curl http://localhost:8000/health
```

---

### Transactions

**List all transactions**

```bash
curl http://localhost:8000/api/transactions
```

**Get a single transaction**

```bash
curl http://localhost:8000/api/transactions/<transaction_id>
```

**Create a transaction**

```bash
curl -X POST http://localhost:8000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-03-30",
    "description": "Grocery store",
    "category": "Food",
    "amount": -85.42
  }'
```

**Update a transaction**

```bash
curl -X PUT http://localhost:8000/api/transactions/<transaction_id> \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Whole Foods",
    "amount": -92.15
  }'
```

**Delete a transaction**

```bash
curl -X DELETE http://localhost:8000/api/transactions/<transaction_id>
```

---

### Net Worth Snapshots

**List all snapshots (with nested accounts)**

```bash
curl http://localhost:8000/api/snapshots
```

**Get a single snapshot (with nested accounts)**

```bash
curl http://localhost:8000/api/snapshots/<snapshot_id>
```

**Create a snapshot with accounts (single request)**

```bash
curl -X POST http://localhost:8000/api/snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "snapshot_date": "2026-03-30",
    "accounts": [
      {
        "account_key": "checking",
        "account_name": "Chase Checking",
        "amount": 5200.00,
        "account_type": "asset",
        "sort_order": 1
      },
      {
        "account_key": "credit_card",
        "account_name": "Visa Card",
        "amount": 1500.00,
        "account_type": "liability",
        "sort_order": 2
      }
    ]
  }'
```

**Update a snapshot**

```bash
curl -X PUT http://localhost:8000/api/snapshots/<snapshot_id> \
  -H "Content-Type: application/json" \
  -d '{ "snapshot_date": "2026-04-01" }'
```

**Delete a snapshot (cascades to accounts)**

```bash
curl -X DELETE http://localhost:8000/api/snapshots/<snapshot_id>
```

---

### Snapshot Account Entries

**List accounts for a snapshot**

```bash
curl http://localhost:8000/api/snapshots/<snapshot_id>/accounts
```

**Get a single account entry**

```bash
curl http://localhost:8000/api/snapshots/<snapshot_id>/accounts/<account_id>
```

**Add an account entry to an existing snapshot**

```bash
curl -X POST http://localhost:8000/api/snapshots/<snapshot_id>/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "account_key": "savings",
    "account_name": "High-Yield Savings",
    "amount": 15000.00,
    "account_type": "asset",
    "sort_order": 3
  }'
```

**Update an account entry**

```bash
curl -X PUT http://localhost:8000/api/snapshots/<snapshot_id>/accounts/<account_id> \
  -H "Content-Type: application/json" \
  -d '{ "amount": 16000.00 }'
```

**Delete an account entry**

```bash
curl -X DELETE http://localhost:8000/api/snapshots/<snapshot_id>/accounts/<account_id>
```
