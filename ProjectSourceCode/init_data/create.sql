-- DROPS at top in reverse order, apparently can help prevent foreign key issues when deleting rows when in reverse order
DROP TABLE IF EXISTS analysis_to_users;
DROP TABLE IF EXISTS analysis;
DROP TABLE IF EXISTS songs_to_lyrics;
DROP TABLE IF EXISTS lyrics;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Text instead of varchar for hashing key, unknown hash size.
  email VARCHAR(50) NOT NULL
);

-- Are we planning to store the album covers or do those only appear when searching?
CREATE TABLE songs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(75) NOT NULL,
  album VARCHAR(75),
  artist VARCHAR(50) NOT NULL,
  album_cover VARCHAR(255) -- URL/path to album cover image IF needed
);
-- ON DELETE CASCADE binds to other table i.e, if we delete a song from database, associated lyrics will also be deleted
-- Prevents "floating" entries such as deleting a song but the lyrics is still in the database and now linked to nothing.

CREATE TABLE songs_to_lyrics (
  song_id INT NOT NULL,
  lyrics_id INT NOT NULL,
  PRIMARY KEY (song_id, lyrics_id),
  FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
  FOREIGN KEY (lyrics_id) REFERENCES lyrics(id) ON DELETE CASCADE
);

CREATE TABLE lyrics (
  id SERIAL PRIMARY KEY,
  english TEXT, -- TEXT has character limit of around 60,000 characters (Lowest amount after VARCHAR)
  spanish TEXT -- More languages possible if needed, spanish for default 2nd language
);

CREATE TABLE analysis (
  id SERIAL PRIMARY KEY,
  def_analysis TEXT,
  hist_analysis TEXT
);

-- Intended use so users can save analyses to their profile
CREATE TABLE analysis_to_users (
  user_id INT NOT NULL,
  analysis_id INT NOT NULL,
  PRIMARY KEY (user_id, analysis_id), -- Composite primary key prevents one user from saving the same analysis multiple times
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (analysis_id) REFERENCES analysis(id) ON DELETE CASCADE 
);