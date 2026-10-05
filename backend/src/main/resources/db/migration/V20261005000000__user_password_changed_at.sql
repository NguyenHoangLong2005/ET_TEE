-- Thoi diem doi mat khau gan nhat. JwtAuthenticationFilter tu choi token phat hanh truoc moc nay,
-- de doi / dat lai mat khau thi cac phien dang nhap cu (vd: may bi lo mat khau) mat hieu luc.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamp without time zone;
