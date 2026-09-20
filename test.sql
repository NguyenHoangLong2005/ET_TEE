SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
      table_name = 'users'
      OR table_name ILIKE '%role%'
      OR table_name ILIKE '%permission%'
  )
ORDER BY table_name, ordinal_position;