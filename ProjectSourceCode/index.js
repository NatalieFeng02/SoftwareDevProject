
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;
console.log(apiKey);

const OpenAI = require('openai');
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');

const fetch = require('node-fetch');

const queryString = require('querystring');

const app = express();

const openai = new OpenAI(apiKey);
const SpotifyWebApi = require('spotify-web-api-node');
const { title } = require('process');

// Set up Handlebars engine with custom directories
app.engine('.hbs', exphbs({
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts'), // Assuming you have a layouts directory inside 'views'
  partialsDir: path.join(__dirname, 'views/partials'), // Correct path to your partials
  defaultLayout: 'main', // Assuming 'main.hbs' is your main layout inside 'views/layouts'
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views/pages')); // Correct path to your pages


// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse request bodies (as JSON)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('home'); // This assumes that you have a 'home.hbs' file in your views/pages directory
});

async function fetchAlbumCovers() {
  // Step 1: Get an Access Token
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
    },
    body: queryString.stringify({ grant_type: 'client_credentials' }),
  });

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Step 2: Fetch Playlist Tracks
  const playlistId = '4KmcBdDIbHeO0alvCfk2TC';
  const albumsResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const albumsData = await albumsResponse.json();

  // Step 3: Extract Album Covers
  // Note: This assumes the playlist's tracks have associated albums with images.
  // Filter out tracks without images or albums to prevent errors.
  const albumCovers = albumsData.items.filter(item => item.track && item.track.album && item.track.album.images.length > 0).map(item => ({
    imageUrl: item.track.album.images[0].url, // Get the first image (usually the largest)
    name: item.track.album.name,
    artist: item.track.album.artists.map(artist => artist.name).join(', '),
  }));

  return albumCovers;
}

app.get('/api/album-covers', async (req, res) => {
  try {
    const albumCovers = await fetchAlbumCovers();
    res.json(albumCovers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching album covers" });
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/search', (req, res) => {
  res.render('search');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = $1 LIMIT 1`;
  const values = [username];
  
  db.one(query, values)
    .then(async result => {
      // At this point, a user was found, proceed with password check
      const user = result;
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        // Correct password
        req.session.user = user;
        req.session.save(() => {
          return res.redirect('/search');
        });
      } else {
        // Incorrect password
        return res.render('/login', {errorMessage: 'Incorrect username or password.'});
      }
    })
    .catch(error => {
      // Handle both the "no user found" scenario and other potential errors
      if (error.name === 'QueryResultError') {
        // This error name might differ based on your DB library; adjust accordingly.
        // User not found
        return res.render('/login', {errorMessage: 'No account found with that username.'});
      } 
      else {
        // Other errors (e.g., database connection issues)
        console.error(error);
        return res.render('/login', {errorMessage: 'An error occurred, please try again later.'});
      }
    });
});

// // Route to render the create form
// app.get("/", (req, res) => {
//   res.redirect("/login");
// });
// app.get('/create', (req, res) => {
//   res.render('create');
// });

// // Route to handle form submission and create a new user
// app.post('/create', async (req, res) => {
//   const { username, email, password } = req.body;

//   try {
//     // Hash the password
//     const hash = await bcrypt.hash(password, 10);

//     // Insert user into the database
//     const query = 'INSERT INTO users(username, email, password) VALUES ($1, $2, $3)';
//     await pool.query(query, [username, email, hash]);

//     // Redirect to login page upon successful creation
//     res.redirect('/login');

//   } catch (error) {
//     console.error(error);
//     res.redirect('/create');
//   }
// });

// app.get("/", (req, res) => {
//   res.redirect("/login");
// });
app.get("/create", (req, res) => {
  res.render("create");
});
app.post("/create", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [username]);
    if (existingUser) {
      return res.render("create", {
        message: "Username already exists. Please choose a different username.",
      });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.none("INSERT INTO users(username, email, password) VALUES($1, $2, $3)", [username, email, hash]);
    res.redirect("/login");
  } catch (error) {
    console.error("Error during registration:", error);
    res.render("create", {
      message: "Registration failed. Please try again.",
    });
  }
});



app.get('/results', async (req, res) => {
  console.log(req.query);
  const searchQuery = req.query.searchQuery || ''; // Get the search query from the URL parameter

  try {
    const accessToken = await getSpotifyAccessToken(); // Fetch a new access token using the provided function
    const apiUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const data = await response.json();

    let songData = data.tracks.items.map(track => ({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      albumCover: track.album.images.reduce((largest, image) => {
        if (image.height > largest.height) return image;
        return largest;
      }, track.album.images[0]).url
    }));

    // Apply cleanTitle and cleanArtist functions before checking lyrics availability
    const filteredSongData = await Promise.all(songData.map(async song => {
      const cleanedTitle = cleanTitle(song.title);
      const cleanedArtist = cleanArtist(song.artist);
      const lyricsResponse = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`);
      if (lyricsResponse.ok) {
        return { ...song, lyricsAvailable: true };
      }
      return null;
    }));

    // Remove tracks where lyrics are not available (null entries)
    const songsWithLyrics = filteredSongData.filter(song => song !== null);

    const itemsPerPage = 8;
    const page = req.query.page || 1;
    const totalItems = songsWithLyrics.length;
  
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (Number(page) - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = songsWithLyrics.slice(startIndex, endIndex);
  
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push({ number: i, isCurrent: i === Number(page) });
    }

    res.render('results', {
      searchQuery: searchQuery,
      searchResults: paginatedItems,
      pages: pageNumbers,
      totalPages: totalPages,
      lastPageIsCurrent: Number(page) === totalPages,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

async function getSpotifyAccessToken() {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

function cleanTitle(title) {
  // Define a list of patterns that you want to remove from the title
  const patternsToRemove = [
    /\s-\s\d{4}\sRemaster$/i,  // Matches " - YYYY Remaster"
    /\s-\s\d{4}\sVersion$/i,   // Matches " - YYYY Version"
    /\s-\s\d{4}\sReissue$/i,   // Matches " - YYYY Reissue"
    /\s-\sRemastered$/i,       // Matches " - Remastered"
    /\s-\sLive$/i,             // Matches " - Live"
    /\s-\sIncluding\s".+"$/i,  // Matches " - Including "Something""
    /\s-\s\d{4}\s.*$/i,        // Matches " - YYYY" followed by anything (use with caution)
    /\s\(feat\.\s[^)]+\)/i,    // Matches " (feat. Artist Name)"
    /\s\([^)]+\)/i, 
  ];

  // Remove each pattern from the title
  patternsToRemove.forEach(pattern => {
    title = title.replace(pattern, '');
  });

  return title.trim();
}

function cleanArtist(artist) {
  // Define a pattern to detect multiple artists
  const multipleArtistsPattern = /,|feat\.?|&/i;

  // Split the artist string by the pattern and trim white spaces
  const artists = artist.split(multipleArtistsPattern).map(s => s.trim());

  // Return the first artist only
  return artists[0];
}

app.get('/analysis', async (req, res) => {
  const { title, artist } = req.query;
  const cleanedTitle = cleanTitle(decodeURIComponent(title));
  const cleanedArtist = cleanArtist(decodeURIComponent(artist));
 const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`;
  const prompt = `Conclude your analysis in a complete sentence in 180 tokens or less. This is a section of the lyrics from "${title}" by "${artist}". Do NOT mention the song or the album in the first sentence of the paragraph. Give me interesting information about this section of the lyrics:  It could be analysis of the meaning, it could be historical context or context to the artist, it could be analysis of the literary devices used, it could be an anecdote behind the lyrics... Just make it interesting. However, if the section is brief or if it is just ad libs, then keep your analysis in 17 words or less.`;
  console.log(`Song: "${title}" by "${artist}"`);

  try {
    const lyricsResponse = await fetch(apiUrl);
    if (!lyricsResponse.ok) throw new Error(`Lyrics fetch failed: ${lyricsResponse.statusText}`);
    
    const lyricsData = await lyricsResponse.json();
    if (!lyricsData.lyrics) throw new Error("Lyrics not found.");

    const cleanedLyrics = cleanLyrics(lyricsData.lyrics, title, artist);
    // Split the cleaned lyrics into an array of lines/chunks
    // Previously: const lyricsChunks = cleanedLyrics.split('\n').filter(line => line.trim() !== '');
    // Now split by paragraphs instead of single line breaks
    const lyricsParagraphs = cleanedLyrics.split('\n\n').filter(paragraph => paragraph.trim() !== '');

    // Initialize an array to hold the analysis results
    const analysisResults = [];

    // Use Promise.all to wait for all analyses to complete
    await Promise.all(lyricsParagraphs.map(async (paragraph, index) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          "model": "gpt-4-0125-preview",
          "messages": [
            {
              "role": "system",
              "content": prompt
            },
            {
              "role": "user",
              "content": paragraph
            }
          ],
          "temperature": 0.7,
          "max_tokens": 180
        }),
      });
    
      const json = await response.json();
      const analysis = json.choices && json.choices[0].message.content;
      // Attach the original index to each analysis result
      return {index, lyric: paragraph, analysis};
    })).then(results => {
      // Sort the results based on the original index to maintain order
      analysisResults.push(...results.sort((a, b) => a.index - b.index));
    });

    let spotifyUri = '';
      try {
        const spotifyResponse = await spotifyApi.searchTracks(`${title} ${artist}`);
        if (spotifyResponse.body.tracks.items.length > 0) {
          spotifyUri = spotifyResponse.body.tracks.items[0].uri; // Get the URI of the first track
        }
          } catch (err) {
            console.error('Spotify search failed:', err);
          }
    
          spotifyUri = stripSpotifyUri(spotifyUri);
    console.log(spotifyUri);
    res.render('analysis', {
      title: decodeURIComponent(title),
      artist: decodeURIComponent(artist),
      album: decodeURIComponent(req.query.album),
      analysisResults, // Pass the array of lyrics and analyses
      spotifyUri 
    });
  } catch (error) {
    console.error('Error:', error);
    res.render('analysis', {
      title: decodeURIComponent(title),
      artist: decodeURIComponent(artist),
      album: decodeURIComponent(req.query.album),
      error: `An error occurred: ${error.message}`,
      analysisResults: [] // Ensure the template can handle an empty array
    });
  }
});

function cleanLyrics(lyrics, title, artist) {
  // Define the prefix pattern to remove
  // Adjust the pattern as needed to match the exact format
  const pattern = `Paroles de la chanson ${title} par ${artist}`;
  
  // Remove the pattern from the lyrics
  let cleanedLyrics = lyrics.replace(pattern, '').trim();
  
  // Further cleaning if there's a common starting pattern regardless of song/artist
  cleanedLyrics = cleanedLyrics.replace(/^Paroles de la chanson .+ par .+/, '').trim();

  return cleanedLyrics;
}

function stripSpotifyUri(spotifyUri) {
  const parts = spotifyUri.split(':');
  if (parts.length === 3 && parts[0] === 'spotify' && parts[1] === 'track') {
    return parts[2];
  } else {
    throw new Error('Invalid Spotify URI');
  }
}

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

spotifyApi.clientCredentialsGrant().then(data => {
  spotifyApi.setAccessToken(data.body['access_token']);
}, err => {
  console.log('Something went wrong when retrieving an access token', err);
});


// Route to serve the background page
app.get('/background', async (req, res) => {
  const { title, artist, album } = req.query;

  const cleanedTitle = cleanTitle(decodeURIComponent(title));
  const cleanedArtist = cleanArtist(decodeURIComponent(artist));

  // Prepare the titles and prompts for each section to be analyzed by GPT-3
  const sectionsInfo = [
    { title: "Introduction", description: "Provide a brief overview of the song and its context and significance to the legacy in the artist's career or music history." },
    { title: "Songwriting/Inspiration, Composition, Recording", description: "Discuss the songwriting process, musical composition, studio sessions, and production details.  Include any technical details known about equipment used.  Report on any studio anecdotes there may be.  Dive as deep as possible into these topics. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Historical Context", description: "Explain its era, relevant social, political, or cultural events at the time of its creation, and its influence on the song. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Personal Anecdotes and Stories", description: "Share insights from the stories surrounding the artist from the artist themselves or from people who knew them if there are any. Talk about stories from fans if there are any.  Do NOT talk about anything other than anecdotes. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Reception and Impact", description: "Describe its initial reception, long-term legacy, and influence on musical trends or genres. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Notable Performances and Versions", description: "Highlight notable live performances, covers, and remixes.  If there are stories behind any of these, talk about them. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Controversies and Challenges", description: "Cover any legal issues or controversies. If there are no legal issues or controversies, respond with: '-'. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." }
  ];

  // Initialize an array to hold the background information results
  let backgroundResults = [];

  try {
    const coverUrl = await fetchSpotifyAlbumCover(cleanedTitle, cleanedArtist);
    const credits = await fetchSongCredits(cleanedTitle, cleanedArtist);

    const gptPromises = sectionsInfo.map(sectionInfo => {
      const messages = [{
        "role": "system",
        "content": `I am writing information about the song "${cleanedTitle}" by "${cleanedArtist}". I must only write about factual information.  I must write the most interesting information I can find.  I must not organize the information into sections.`
      }, {
        "role": "user",
        "content": `${sectionInfo.description}`
      }];

      return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4-0125-preview",
          messages,
          temperature: 0.5,
          max_tokens: 1200
        }),
      })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          console.error('GPT-3 API error:', json.error);
        }
        const content = json.choices && json.choices.length > 0 && json.choices[0].message ? json.choices[0].message.content : 'No content available.';
        return { title: sectionInfo.title, content: content };
      })
      .catch(error => {
        console.error('Fetch error:', error);
        return { title: sectionInfo.title, content: 'Error retrieving content.' };
      });
    });

    backgroundResults = await Promise.all(gptPromises);

    res.render('background', {
      title: decodeURIComponent(title),
      artist: decodeURIComponent(artist),
      album: decodeURIComponent(album),
      cover: coverUrl,
      credits: credits,
      backgroundResults
    });
  } catch (error) {
    console.error('Catch error:', error);
    res.render('background', {
      error: `An error occurred: ${error.message}`,
      backgroundResults: [] // Ensure the template can handle an empty array
    });
  }
});

async function fetchSpotifyAlbumCover(cleanedTitle, cleanedArtist) {
  try {
    // Use the Spotify API to search for the track using the cleaned title and artist
    const response = await spotifyApi.searchTracks(`track:${cleanedTitle} artist:${cleanedArtist}`, { limit: 1 });
    if (response.body.tracks.items.length > 0) {
      // Assuming the first match is the correct one, get the album's images
      const albumImages = response.body.tracks.items[0].album.images;
      // Return the URL of the first image (usually the largest) if available
      if (albumImages.length > 0) {
        return albumImages[0].url;
      } else {
        throw new Error('No album cover found');
      }
    } else {
      throw new Error('No track found with the specified title and artist');
    }
  } catch (error) {
    console.error('Spotify API error:', error);
    throw error; // Rethrow the error to be caught by the calling function
  }
}

async function fetchSongCredits(songName, artistName) {
  try {
    const searchResponse = await spotifyApi.searchTracks(`track:${songName} artist:${artistName}`, { limit: 1 });
    if (searchResponse.body.tracks.items.length === 0) {
      throw new Error('Track not found.');
    }

    const trackId = searchResponse.body.tracks.items[0].id;
    const trackResponse = await spotifyApi.getTrack(trackId);

    // Format the release date to include month and day if available
    let formattedReleaseDate = "-";
    if (trackResponse.body.album.release_date) {
      formattedReleaseDate = formatReleaseDate(trackResponse.body.album.release_date);
    }

    // Initialize the credits object
    let credits = {
      performers: getCreditInfo(trackResponse.body.artists.map(artist => artist.name).join(', ')),
      writers: getCreditInfo("Example Writers"),
      producers: getCreditInfo("Example Producers"),
      releaseDate: formattedReleaseDate
    };

    return credits;
  } catch (error) {
    console.error('Error fetching song credits:', error);
    throw error;
  }
}

// Helper function to format release date
function formatReleaseDate(dateString) {
  console.log(dateString);
  // Check if dateString is in full YYYY-MM-DD format
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Convert to more readable format, e.g., "Month DD, YYYY"
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  // Return as is if not in full date format
  return dateString;
}

// Existing helper function
function getCreditInfo(creditDetail) {
  return creditDetail.startsWith("Example") ? "-" : creditDetail;
}


// Handle logout action
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('pages/logout');
});


const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};
// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).send('Sorry, that page does not exist!');
});

// Set the app to listen on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





