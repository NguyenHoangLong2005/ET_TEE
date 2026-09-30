# Legacy migrations (KHONG chay nua)

Cac file trong thu muc nay tung nam o `db/migration/`, nhung **Flyway chua bao gio
duoc khai bao trong `pom.xml`** nen chung khong he duoc thi hanh. Schema that cua
database duoc Hibernate `ddl-auto=update` tao ra dan dan.

Trang thai `flyway_schema_history` tren DB that:

| rank | version        | description         | type     |
|------|----------------|---------------------|----------|
| 1    | 20260908000000 | << Flyway Baseline >> | BASELINE |

Nghia la DB da duoc danh dau baseline tai `20260908000000`, va **20 file co version
cao hon (V20260913… → V20260927…) chua tung chay**. Neu de chung lai trong
`db/migration/` khi bat Flyway, lan `migrate` dau tien se co chay het 20 file do len
DB that — day la ly do chung duoc chuyen ra day.

Giu lai de tra cuu lich su. **Khong xoa, khong chuyen nguoc lai `db/migration/`.**
Moi thay doi schema tu nay tro di viet thanh file moi trong `db/migration/` voi
version lon hon `20260908000000`.
