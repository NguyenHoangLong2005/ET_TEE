#!/usr/bin/env bash
#
# Kiem chung db/migration/V1__baseline.sql bang cach dung mot PostgreSQL RONG
# trong Docker roi chay flyway migrate tu dau.
#
# KHONG cham vao Supabase. Moi thu chay trong container cuc bo va bi xoa o cuoi.
#
#   bash scripts/verify-baseline.sh
#
# Yeu cau: Docker Desktop dang chay.
set -euo pipefail

# PostgreSQL 17 - cung major version voi Supabase (17.6).
PG_IMAGE="postgres:17"
# Khop voi phien ban Flyway ma Spring Boot 3.4.3 quan ly.
FLYWAY_IMAGE="flyway/flyway:10.20.1"

NET="ettee-baseline-net"
PG="ettee-baseline-pg"
PGPASS="baseline_check_only"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$REPO_ROOT/backend/src/main/resources/db/migration"

cleanup() {
  echo
  echo "--- don dep ---"
  docker rm -f "$PG"  >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== 1. Dung PostgreSQL rong ==="
docker network create "$NET" >/dev/null 2>&1 || true
docker rm -f "$PG" >/dev/null 2>&1 || true
docker run -d --name "$PG" --network "$NET" \
  -e POSTGRES_PASSWORD="$PGPASS" \
  -e POSTGRES_DB=postgres \
  "$PG_IMAGE" >/dev/null

echo -n "    doi database san sang"
for _ in $(seq 1 60); do
  if docker exec "$PG" pg_isready -U postgres -q 2>/dev/null; then break; fi
  echo -n "."
  sleep 1
done
echo " ok"
docker exec "$PG" psql -U postgres -tAc "select version()" | sed 's/^/    /'

echo
echo "=== 2. Chay flyway migrate tu dau ==="
docker run --rm --network "$NET" \
  -v "$MIGRATIONS":/flyway/sql:ro \
  "$FLYWAY_IMAGE" \
  -url="jdbc:postgresql://$PG:5432/postgres" \
  -user=postgres \
  -password="$PGPASS" \
  -connectRetries=10 \
  -cleanDisabled=false \
  migrate

echo
echo "=== 3. Ket qua schema dung duoc tu V1__baseline.sql ==="
docker exec "$PG" psql -U postgres -tAc "
  select
    (select count(*) from information_schema.tables
       where table_schema='public' and table_type='BASE TABLE'
         and table_name <> 'flyway_schema_history')      as bang,
    (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
       join pg_namespace n on n.oid=t.relnamespace
       where n.nspname='public' and c.contype='p')        as khoa_chinh,
    (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
       join pg_namespace n on n.oid=t.relnamespace
       where n.nspname='public' and c.contype='f')        as khoa_ngoai,
    (select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid
       join pg_namespace n on n.oid=t.relnamespace
       where n.nspname='public' and c.contype='u')        as unique_constraint,
    (select count(*) from pg_indexes where schemaname='public')  as index_tong,
    (select count(*) from pg_sequences where schemaname='public') as sequence
" | awk -F'|' '{
    printf "    bang              = %s\n", $1;
    printf "    khoa chinh (PK)   = %s\n", $2;
    printf "    khoa ngoai (FK)   = %s\n", $3;
    printf "    unique constraint = %s\n", $4;
    printf "    index (tong)      = %s\n", $5;
    printf "    sequence          = %s\n", $6;
  }'

echo
echo "=== 4. Doi chieu voi so lieu do tren Supabase ngay 2026-09-28 ==="
cat <<'EXPECTED'
    Do tren Supabase luc sinh baseline:
      bang     = 55
      sequence = 45   (7 sequence khai bao tuong minh trong baseline,
                       38 cai con lai do cot IDENTITY tu tao)

    So "bang" khac 55 nghia la baseline thieu hoac thua bang -> bao lai.
    Cac con so khac chi de tham khao.
EXPECTED

echo
echo "=== 5. Danh sach bang dung duoc ==="
docker exec "$PG" psql -U postgres -tAc "
  select table_name from information_schema.tables
   where table_schema='public' and table_type='BASE TABLE'
     and table_name <> 'flyway_schema_history' order by 1" | paste -sd' ' - | fold -s -w 100 | sed 's/^/    /'

echo
echo "=== XONG: neu buoc 2 in 'Successfully applied 1 migration' thi baseline hop le ==="
