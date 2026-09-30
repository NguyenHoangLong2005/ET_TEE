CREATE OR REPLACE FUNCTION public.variant_signature(p_variant uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
SELECT coalesce(
    string_agg(attribute_id::TEXT || '=' || attribute_value_id::TEXT, '|' ORDER BY attribute_id),
    ''
)
FROM ettee.variant_attribute_values
WHERE variant_id = p_variant;
$$;
