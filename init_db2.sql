-- NovelToScript 数据库初始化脚本（第二部分）
-- 先连接到 noveltoscript 数据库后再执行此文件

GRANT ALL ON SCHEMA public TO "user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "user";
