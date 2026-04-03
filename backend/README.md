# Budget Backend

Express.js REST API backed by Supabase for managing personal transactions and net-worth snapshots.

## Setup

```bash
cp .env.example .env   # fill in your Supabase credentials
npm install
npm start              # or `npm run dev` for watch mode
```

## Authentication

Every request (except `GET /health`) requires a Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

You can obtain a token by signing in through Supabase Auth (e.g. `supabase.auth.signInWithPassword`).

---

## API Endpoints

All examples use `TOKEN` as a placeholder. Replace it with a real Supabase access token.

### Health Check

```bash
curl http://localhost:3000/health
```

---

### Transactions

**List all transactions**

```bash
curl http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN"
```

**Get a single transaction**

```bash
curl http://localhost:3000/api/transactions/<transaction_id> \
  -H "Authorization: Bearer $TOKEN"
```

**Create a transaction**

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
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
curl -X PUT http://localhost:3000/api/transactions/<transaction_id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Whole Foods",
    "amount": -92.15
  }'
```

**Delete a transaction**

```bash
curl -X DELETE http://localhost:3000/api/transactions/<transaction_id> \
  -H "Authorization: Bearer $TOKEN"
```

---

### Net Worth Snapshots

**List all snapshots (with nested accounts)**

```bash
curl http://localhost:3000/api/snapshots \
  -H "Authorization: Bearer $TOKEN"
```

**Get a single snapshot (with nested accounts)**

```bash
curl http://localhost:3000/api/snapshots/<snapshot_id> \
  -H "Authorization: Bearer $TOKEN"
```

**Create a snapshot with accounts (single request)**

```bash
curl -X POST http://localhost:3000/api/snapshots \
  -H "Authorization: Bearer $TOKEN" \
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
curl -X PUT http://localhost:3000/api/snapshots/<snapshot_id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "snapshot_date": "2026-04-01" }'
```

**Delete a snapshot (cascades to accounts)**

```bash
curl -X DELETE http://localhost:3000/api/snapshots/<snapshot_id> \
  -H "Authorization: Bearer $TOKEN"
```

---

### Snapshot Account Entries

**List accounts for a snapshot**

```bash
curl http://localhost:3000/api/snapshots/<snapshot_id>/accounts \
  -H "Authorization: Bearer $TOKEN"
```

**Get a single account entry**

```bash
curl http://localhost:3000/api/snapshots/<snapshot_id>/accounts/<account_id> \
  -H "Authorization: Bearer $TOKEN"
```

**Add an account entry to an existing snapshot**

```bash
curl -X POST http://localhost:3000/api/snapshots/<snapshot_id>/accounts \
  -H "Authorization: Bearer $TOKEN" \
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
curl -X PUT http://localhost:3000/api/snapshots/<snapshot_id>/accounts/<account_id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 16000.00 }'
```

**Delete an account entry**

```bash
curl -X DELETE http://localhost:3000/api/snapshots/<snapshot_id>/accounts/<account_id> \
  -H "Authorization: Bearer $TOKEN"
```
