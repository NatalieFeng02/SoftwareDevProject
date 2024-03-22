DROP TABLE IF EXISTS users; -- Store favorites here?
CREATE TABLE users (
  username VARCHAR(50) SERIAL PRIMARY KEY,
  password CHAR(60) NOT NULL
);

DROP TABLE IF EXISTS songs; -- Are we planning to store the album covers or do those only appear when searching?
CREATE TABLE songs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(75) NOT NULL,
  album VARCHAR(75),
  artist VARCHAR(50) NOT NULL
)

DROP TABLE IF EXISTS songs_to_lyrics;
CREATE TABLE songs_to_lyrics (
  song_id INT NOT NULL,
  lyrics_id INT NOT NULL
)

DROP TABLE IF EXISTS lyrics;
CREATE TABLE lyrics (
  id SERIAL PRIMARY KEY
  english TEXT, -- TEXT has character limit of around 60,000 characters (Lowest amount after VARCHAR)
  spanish TEXT -- More languages possible if needed, spanish for default 2nd language
)

DROP TABLE IF EXISTS analysis;
CREATE TABLE analysis (
  id SERIAL PRIMARY KEY,
  def_analysis TEXT,
  hist_analysis TEXT
)

DROP TABLE IF EXISTS analysis_to_users; -- Intended use so users can save analyses to their profile
CREATE TABLE analysis_to_users (
  user_id INT NOT NULL,
  analysis_id INT NOT NULL
)