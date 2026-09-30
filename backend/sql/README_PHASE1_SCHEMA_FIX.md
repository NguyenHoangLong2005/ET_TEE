# Phase 1 – Manual DB schema fix (Supabase/PostgreSQL)

## 1️⃣ What this script does
- **Adds missing columns** to `users`, `orders`, and `product_reviews` tables.
- **Adds a UNIQUE constraint** on `product_reviews.order_item_id` (only if it does not already exist).
- **Adds a foreign‑key** `fk_product_reviews_order_item` linking `order_item_id` → `order_items(id)` (only if it does not already exist).
- All `ALTER TABLE … ADD COLUMN` statements are **`IF NOT EXISTS`**, so the script is idempotent.
- Constraint creation is wrapped in DO blocks that **first check `pg_constraint`** to avoid duplicate‑object errors.

## 2️⃣ How to run the script on Supabase
1. Open the Supabase dashboard → **SQL editor**.
2. Copy the full contents of `backend/sql/fix_phase1_schema.sql` (the file created in the repo).
3. Paste into the editor and click **RUN**.
4. The script will finish with `SELECT 1`‑style messages; no errors mean all columns/constraints were added (or already existed).

## 3️⃣ Pre‑flight checks before adding constraints
If the script tries to add the UNIQUE or FK constraints and **fails**, you must inspect the data first.

### 3.1 Check for duplicate `order_item_id` values (non‑NULL)
```sql
SELECT order_item_id, COUNT(*)
FROM product_reviews
WHERE order_item_id IS NOT NULL
GROUP BY order_item_id
HAVING COUNT(*) > 1;
```
- If this query returns rows, there are duplicate references. **Do not add the UNIQUE constraint** – resolve duplicates manually or keep the column without the constraint.

### 3.2 Check for orphan `order_item_id` values (no matching row in `order_items`)
```sql
SELECT pr.order_item_id
FROM product_reviews pr
LEFT JOIN order_items oi ON oi.id = pr.order_item_id
WHERE pr.order_item_id IS NOT NULL AND oi.id IS NULL;
```
- If any rows are returned, the FK would fail. **Do not add the foreign‑key** until the orphan records are fixed (e.g., delete or correct the IDs).

### 3.3 What the script does in those cases
- The script **always adds the columns first** (they are never harmful).
- It then attempts to add the UNIQUE and FK constraints **only if they are not already present**.
- If you run the script *as‑is* and the checks above reveal problems, the `DO $$ … $$;` blocks will raise an error and stop. In that case, manually comment‑out the offending block, fix the data, and re‑run.

## 4️⃣ After the migration
1. **Restart the backend** (`./mvnw spring-boot:run` or your dev command).
2. Verify the API endpoints:
   - `POST /api/auth/login`
   - `GET /api/auth/me`
   - `POST /api/orders/checkout` (guest)
   - `GET /api/orders/{orderCode}` with the guest token
   - `GET /api/products/{slug}/reviews`
3. **Update `application.properties`**:
   - Change `spring.jpa.hibernate.ddl-auto=none` → `spring.jpa.hibernate.ddl-auto=validate`
   - This will make Spring **validate** the schema on startup and alert you if future mismatches appear.

## 5️⃣ Quick verification checklist (run after restart)
| Step | Expected outcome |
|------|-------------------|
| Login with existing user | **200 OK**, no `users.role` error |
| Guest checkout | **200 OK**, no `customer_name` / related column errors |
| Fetch order details (guest token) | **200 OK** |
| List product reviews | **200 OK**, no 500 error |
| `mvnw clean package` | **PASS** |
| `npm run build` (frontend) | **PASS** |

If any of the above fail, capture the exact error message/stack trace and let me know – we’ll adjust the migration or entity definitions accordingly.
