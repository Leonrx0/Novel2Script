-- NovelToScript 数据库初始化脚本（第一部分）
-- 在默认数据库（如 postgres）中执行

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'user') THEN
        CREATE USER "user" WITH PASSWORD 'password';
    END IF;
END
$$;

CREATE DATABASE noveltoscript;

GRANT ALL PRIVILEGES ON DATABASE noveltoscript TO "user";
