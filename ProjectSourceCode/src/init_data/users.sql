-- Change .env to POSTGRES_DB="music_db"
-- docker-compose up -d
-- docker-compose exec db psql -U postgres
-- \c music_db;
-- \l \dt \d table_name

-- INSERT INTO users
--     (id, username, email, password)
-- VALUES
--     (3, 'testuser3', 'test3@colorado.edu', 'test123') returning *;
