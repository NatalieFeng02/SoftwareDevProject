-- DROPS at top in reverse order, apparently can help prevent foreign key issues when deleting rows when in reverse order
--DROP TABLE IF EXISTS analysis_to_users;
--/DROP TABLE IF EXISTS analysis;
--DROP TABLE IF EXISTS songs_to_lyrics;
--DROP TABLE IF EXISTS lyrics;
--DROP TABLE IF EXISTS songs;
--DROP TABLE IF EXISTS users;

-- CREATE TABLE users (
--   id SERIAL PRIMARY KEY,
--   username VARCHAR(50) UNIQUE NOT NULL,
--   email VARCHAR(50) NOT NULL,
--   password TEXT NOT NULL -- Text instead of varchar for hashing key, unknown hash size.
-- );

-- DROP TABLE IF EXISTS analysis_to_users CASCADE;
-- DROP TABLE IF EXISTS songs_to_lyrics CASCADE;
-- DROP TABLE IF EXISTS lyrics CASCADE;
-- DROP TABLE IF EXISTS songs CASCADE;
-- DROP TABLE IF EXISTS user_relationships CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;


CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(50),
    password CHAR(60) NOT NULL
);
ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- Create a table for user relationships
CREATE TABLE user_relationships (
    follower_id INT,
    following_id INT,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Are we planning to store the album covers or do those only appear when searching?
CREATE TABLE songs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(75) NOT NULL,
  album VARCHAR(75),
  artist VARCHAR(50) NOT NULL,
  album_cover VARCHAR(255) -- URL/path to album cover image IF needed
);

CREATE TABLE lyrics (
  id SERIAL PRIMARY KEY,
  english TEXT, -- TEXT has character limit of around 60,000 characters (Lowest amount after VARCHAR)
  spanish TEXT -- More languages possible if needed, spanish for default 2nd language
);

CREATE TABLE songs_to_lyrics (
  song_id INT NOT NULL,
  lyrics_id INT NOT NULL,
  PRIMARY KEY (song_id, lyrics_id),
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (lyrics_id) REFERENCES lyrics(id) ON DELETE CASCADE
);


CREATE TABLE analysis (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  artist VARCHAR(100) NOT NULL,
  album VARCHAR(100) NOT NULL,
  "albumCover" VARCHAR(500),
  "dominantColor" TEXT,
  "spotifyUri" VARCHAR(255),
  def_analysis TEXT,
  hist_analysis TEXT,
  credits JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (title, artist, album, user_id)
);
