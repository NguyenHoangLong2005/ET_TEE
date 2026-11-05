-- Trang admin "Mo hinh AI" gio chi xem: bang ai_model_versions chi con la nhat ky do
-- scripts/pipeline/retrain.py ghi (REGISTRY_NAME ben duoi). Cac dong them tay qua nut
-- "Dang ky mo hinh" cu (vd "StyleMatching v.1.0.0") khong ung voi mo hinh nao dang chay.
DELETE FROM ai_model_versions
WHERE model_name NOT IN (
    'SASRec - Danh rieng cho ban (trang chu)',
    'CSN outfit - Phoi tron bo (PDP)',
    'FP-Growth - Thuong duoc mua kem (gio hang)'
);
