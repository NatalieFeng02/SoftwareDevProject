
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;

const OpenAI = require('openai');
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bcrypt = require('bcryptjs');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const fs = require('fs');
const os = require('os');
const Vibrant = require('node-vibrant');


const bodyParser = require('body-parser');
const session = require('express-session');
const fetch = require('node-fetch');

const queryString = require('querystring');

const app = express();

const hbsHelper = {
  json: function (context) {
    return JSON.stringify(context);
  },
  encodeURIComponent: function(str){
    return encodeURIComponent(str);
  }
};



const openai = new OpenAI(apiKey);
const SpotifyWebApi = require('spotify-web-api-node');
const { title } = require('process');

// Set up Handlebars engine with custom directories
app.engine('.hbs', exphbs({
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts'), // Assuming you have a layouts directory inside 'views'
  partialsDir: path.join(__dirname, 'views/partials'), // Correct path to your partials
  defaultLayout: 'main', // Assuming 'main.hbs' is your main layout inside 'views/layouts'
  helpers: hbsHelper
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views/pages')); // Correct path to your pages

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: {
      expires: null,  // Ensures the cookie expires with the session
      maxAge: null    // No maximum age, cookie lives indefinitely until browser closes
    }
  })
);



app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse request bodies (as JSON)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);
module.exports = db;

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

//loggedin is true if the user is logged in and false if the user is logged out
app.get('/', (req, res) => {
  res.render('home', {loggedin: !!req.session.user});
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
  const playlistId = '1DPLMFnJ3F6iOkDmlEzggq';
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

app.get('/search', async (req, res) => {

  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const playlistData = await fetchAllPlaylistTracks('1DPLMFnJ3F6iOkDmlEzggq'); //fetches playlist for search suggestions
    // Log the data to see what's being passed
    res.render('search', { playlistData: JSON.stringify(playlistData) }); //renders playlist data for HTMl
  } catch (error) {
    console.error('Failed to fetch playlist data:', error);
    res.render('search', { playlistData: JSON.stringify([]) }); // Send empty array on error
  }
});

app.get('/search_users', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const playlistData = await fetchAllPlaylistTracks('1DPLMFnJ3F6iOkDmlEzggq'); //fetches playlist for search suggestions
    // Log the data to see what's being passed
    res.render('search_users', { playlistData: JSON.stringify(playlistData) }); //renders playlist data for HTMl
  } catch (error) {
    console.error('Failed to fetch playlist data:', error);
    res.render('search_users', { playlistData: JSON.stringify([]) }); // Send empty array on error
  }
});

async function fetchAllPlaylistTracks(playlistId) {
  const accessToken = await getSpotifyAccessToken();
  let tracksData = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  while (url && tracksData.length < 50) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch playlist data');
    
    const data = await response.json();
    const batchTracksData = data.items.map(item => ({ //Maps over data.items to create an array of simplified track objects that include only the title, artist(s), and album name.Maps over data.items to create an array of simplified track objects that include only the title, artist(s), and album name.
      title: item.track.name,
      artist: item.track.artists.map(artist => artist.name).join(', '),
      album: item.track.album.name,
    }));

    // Concatenate and truncate to 100 if the addition goes over
    tracksData = tracksData.concat(batchTracksData);
    if (tracksData.length > 100) {
      tracksData = tracksData.slice(0, 50); //If the length exceeds 50 after addition, it slices the array to keep only the first 50 elements.
    }

    url = tracksData.length < 50 ? data.next : null; // Only fetch more if we have less than 100
  }
  
  // Shuffle the array to get a random selection of tracks
  tracksData = shuffleArray(tracksData);

  return tracksData;
}

// Function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}



// Below two endpoints for unit test

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  var insertUser = `INSERT INTO users(username, email, password) VALUES ($1, $2, $3)`;

  try{
    let response = await db.query(insertUser, [username, email, password]);
    res.json({status: 'success', message: 'Registered'});
  }
  catch(err){
    res.json({status: 'error', message: 'Account already exists'})
  }

});

app.delete('/users', async (req, res) => {
  const { username } = req.body;

  var deleteUser = `DELETE FROM users WHERE username = $1`;

  try {
    let response = await db.query(deleteUser, [username]);
    if (response.rowCount > 0) {
      res.json({status: 'success', message: 'User deleted successfully'});
    } else {
      res.json({status: 'error', message: 'User not found'});
    }
  }
  catch (err) {
    res.json({status: 'error', message: 'Error deleting user'});
  }
});

// app.get("/login", (req, res) => {
//   res.render("login");
// });
// app.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const user = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
//       username,
//     ]);
//     if (user) {
//       const passwordMatch = await bcrypt.compare(password, user.password);

//       if (passwordMatch) {
//         req.session.user = user;
//         req.session.save();
//         return res.redirect("/");
//       } else {
//         return res.render("login", {
//           message: "Incorrect username or password.",
//         });
//       }
//     } else {
//       return res.render("login", {
//         message: "User not found. Please register.",
//       });
//     }
//   } catch (error) {
//     console.error("Error during login:", error);
//     return res.render("login", {
//       message: "An error occurred. Please try again.",
//     });
//   }
// });
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [username]);
    
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        // Setting user details in the session, specifically the user ID
        req.session.userId = user.id;  // It's better to store only the user ID or minimal required info
        req.session.user = user;
        req.session.isLoggedIn = true; // This can be used to check if the user is logged in
        await req.session.save(); // Ensure session saving is awaited

        res.redirect("/");  // Redirect the user to the homepage after successful login
      } else {
        // Providing feedback directly in the login form for incorrect password
        res.render("login", {
          incmessage: "Incorrect username or password. Please try again.",
        });
      }
    } else {
      // User not found, offer link to registration
      res.render("login", {
        nfmessage: "User not found. Try again or create a new account.",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    // General error handling for the login process
    res.render("login", {
      errmessage: "An error occurred. Please try again later.",
    });
  }
});



// const a = (req, res, next) => {
//   if (!req.session.user) {
//     return res.redirect("/login");
//   }
//   next();
// };

app.use((req, res, next) => {
  res.locals.user = req.session.users;
  next();
});


// app.get("/", (req, res) => {
//   res.redirect("login");
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
        existmessage: "Username already exists. Please choose a different username.",
      });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.none("INSERT INTO users(username, email, password) VALUES($1, $2, $3)", [username, email, hash]);
    res.redirect('login');
  } catch (error) {
    console.error("Error during registration:", error);
    res.render('create', {
      failmessage: "Registration failed. Please try again.",
    });
  }
});



app.get('/results', async (req, res) => {

  if (!req.session.user) {
    return res.redirect('/login');
  }

  const searchQuery = req.query.searchQuery || ''; //collect search query

  try {
    const accessToken = await getSpotifyAccessToken();
    const apiUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50`; //constructs URL for sportify search API, track limit 50
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();

      //Maps through the items in the fetched data to create an array of song data, extracting the title, artist, album name, and the URL of the largest album cover image.
    let songData = data.tracks.items.map(track => ({
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      albumCover: track.album.images.reduce((largest, image) => {
        if (image.height > largest.height) return image;
        return largest;
      }, track.album.images[0]).url
    }));

    //checking if each song has lyrics from lyrics.ovh
    const filteredSongData = await Promise.all(songData.map(async song => {
      const cleanedTitle = cleanTitle(song.title);
      const cleanedArtist = cleanArtist(song.artist);
      const lyricsResponse = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`);
      
      if (lyricsResponse.ok) {
        return { ...song, lyricsAvailable: true };
      }
      return null;
    }));

    const songsWithLyrics = filteredSongData.filter(song => song !== null); //creates new array for songsWithLyrics

    //pagination logic
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

    //renders results template to display on webpage
    res.render('results', {
      searchQuery: searchQuery,
      searchResults: paginatedItems,
      pages: pageNumbers,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

app.get('/results_users', async (req, res) => {
  const searchQuery = req.query.searchQuery || ''; // Collect search query
  const followerId = req.session.userId; // Assume you store userId in session

  try {
    const sqlQuery = `
      SELECT u.id, u.username,
        CASE WHEN f.following_id IS NOT NULL THEN true ELSE false END AS is_following,
        CASE WHEN u.id = $1 THEN true ELSE false END AS is_same_user
      FROM users u
      LEFT JOIN user_relationships f ON u.id = f.following_id AND f.follower_id = $1
      WHERE u.username ILIKE $2
      ORDER BY u.username ASC
      LIMIT 50`;
    const values = [followerId, `%${searchQuery}%`];

    const users = await db.query(sqlQuery, values); // Execute the query
    console.log('test result:')
    console.log(users);
    // Pagination logic
    const itemsPerPage = 10;
    const page = parseInt(req.query.page || 1);
    const totalItems = users.length;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = users.slice(startIndex, endIndex);

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push({ number: i, isCurrent: i === page });
    }

    // Renders results_users template to display on webpage
    res.render('results_users', {
      searchQuery: searchQuery,
      searchResults: paginatedItems,
      pages: pageNumbers,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching user data');
  }
});


app.get('/get-user-id', (req, res) => {
  console.log('Session Data:', req.session);
  if (req.session.userId) {  // Checks if session contains user ID
    res.json({ followerId: req.session.userId });
  } else {
    res.status(403).json({ message: 'Not authenticated' });
  }
});




app.post('/follow-user', async (req, res) => {
  try {
      const { followingId } = req.body;
      const followerId = req.session.userId;  // Ensure the user is logged in and session is available
      if (!followerId) {
          return res.status(403).json({ success: false, message: "User not logged in" });
      }
      if (followingId == followerId){
        return res.status(401).json({ success: false, message: "Can't follow yourself" });
      }

      // Assume db.query runs SQL to insert a follow relation
      await db.query("INSERT INTO user_relationships (follower_id, following_id) VALUES ($1, $2)", [followerId, followingId]);
      res.json({ success: true });
  } catch (error) {
      res.status(500).json({ success: false, message: "Database error" });
  }
});

app.post('/unfollow-user', async (req, res) => {
  try {
      const { followingId } = req.body;
      const followerId = req.session.userId;
      if (!followerId) {
          return res.status(403).json({ success: false, message: "User not logged in" });
      }

      await db.query("DELETE FROM user_relationships WHERE follower_id = $1 AND following_id = $2", [followerId, followingId]);
      res.json({ success: true });
  } catch (error) {
      res.status(500).json({ success: false, message: "Database error" });
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

const globalUsedFirstTwoWords = new Set();

app.get('/analysis', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const inNav = true;
  const { title, artist, albumCover } = req.query;
  if (!title || !artist) {
    return res.status(400).send('Song title and artist are required');
  }

  // Decoding and cleaning input data
  const cleanedTitle = cleanTitle(decodeURIComponent(title));
  const cleanedArtist = cleanArtist(decodeURIComponent(artist));
  
  // Asynchronous calls for data needed further in the code
  const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanedArtist)}/${encodeURIComponent(cleanedTitle)}`;
  const dominantColorPromise = getDominantColor(albumCover);
  const lyricsPromise = fetch(apiUrl).then(response => response.json());
  const spotifyPromise = spotifyApi.searchTracks(`${title} ${artist}`);

  // Execute all independent promises in parallel
  const [dominantColor, lyricsData, spotifyResponse] = await Promise.all([dominantColorPromise, lyricsPromise, spotifyPromise]);

  if (!lyricsData.lyrics) {
    console.error("Lyrics not found.");
    return res.status(404).send("Lyrics not found.");
  }

  const cleanedLyrics = cleanLyrics(lyricsData.lyrics, title, artist);
  const lyricsParagraphs = cleanedLyrics.split('\n\n').filter(paragraph => paragraph.trim() !== '');
  const analysisResults = [];
  const usedFirstTwoWords = new Set();

  await Promise.all(lyricsParagraphs.map(async (paragraph, index) => {
    let analysis;
    let firstTwoWords;
    do {
      const restrictions = Array.from(usedFirstTwoWords).join('|');
      const prompt = `Conclude your analysis in a complete sentence in 180 tokens or less. This is a section of the lyrics from "${title}" by "${artist}". Do NOT mention the song or the album in the first sentence of the paragraph. Your paragraph should NOT start with any of these phrases: "${restrictions}". Be creative with your opening line to avoid these. Provide interesting information about this section of the lyrics, which may include: the meaning, historical context, literary devices, anecdotes, or inspirations. Keep it under 17 words if brief, simple or if it is just adlibs.`;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          "model": "gpt-4-turbo",
          "messages": [
            { "role": "system", "content": prompt },
            { "role": "user", "content": paragraph }
          ],
          "temperature": 0.7,
          "max_tokens": 180
        }),
      });

      const json = await response.json();
      analysis = json.choices[0].message.content;
      firstTwoWords = analysis.split(' ').slice(0, 2).join(' ');
    } while (usedFirstTwoWords.has(firstTwoWords));
    usedFirstTwoWords.add(firstTwoWords);
    analysisResults.push({ index, lyric: paragraph, analysis });
  }));

  // Determine the Spotify URI
  let spotifyUri = '';
  if (spotifyResponse.body.tracks.items.length > 0) {
    spotifyUri = stripSpotifyUri(spotifyResponse.body.tracks.items[0].uri);
  }

  analysisResults.sort((a, b) => a.index - b.index);

  // Render the analysis page with the results
  res.render('analysis', {
    title: decodeURIComponent(title),
    artist: decodeURIComponent(artist),
    album: decodeURIComponent(req.query.album),
    userID: req.session.userId,
    analysisResults,
    spotifyUri,
    albumCover,
    dominantColor,
    inNav
  });
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

  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { title, artist, album, albumCover} = req.query;
  const inNav = true;

  const cleanedTitle = cleanTitle(decodeURIComponent(title));
  const cleanedArtist = cleanArtist(decodeURIComponent(artist));

  // Prepare the titles and prompts for each section to be analyzed by GPT-3
  const sectionsInfo = [
    { title: "Introduction", description: "Provide a brief overview of the song and its context and significance to the legacy in the artist's career or music history." },
    { title: "Songwriting/Inspiration, Composition, Recording", description: "Discuss the songwriting process, musical composition, studio sessions, and production details.  Include technical details known about all the equipment used.  Report on any studio anecdotes there may be.  Dive as deep as possible into these topics. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Historical Context", description: "Explain its era, relevant social, political, or cultural events at the time of its creation, and its influence on the song. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Personal Anecdotes and Stories", description: "Share insights from the stories surrounding the artist from the artist themselves or from people who knew them if there are any. Talk about stories from fans if there are any.  Do NOT talk about anything other than anecdotes. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Reception and Impact", description: "Describe its initial reception, long-term legacy, and influence on musical trends or genres. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Notable Performances and Versions", description: "Highlight notable live performances, covers, and remixes.  If there are stories behind any of these, talk about them. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." },
    { title: "Controversies and Challenges", description: "Cover any legal issues or controversies. If there are no legal issues or controversies, respond with: '-'. Do NOT start the paragraph with an introduction about the song title, artist, and album, because we already know what the song is." }
  ];

  // Initialize an array to hold the background information results
  let backgroundResults = [];

  try {
    const dominantColor = await getDominantColor(albumCover);
    console.log('Dominant Color:', dominantColor);

    const coverUrl = await fetchSpotifyAlbumCovers(cleanedTitle, cleanedArtist);
    const credits = await fetchSongCredits(cleanedTitle, cleanedArtist);

    const gptPromises = sectionsInfo.map(sectionInfo => {
      const messages = [{
        "role": "system",
        "content": `I am writing information about the song "${cleanedTitle}" by "${cleanedArtist}". I must only write about factual information. I must write the most interesting information I can find.  I must not organize the information into sections.  If the song was made after april 2023 or I don't have it in my training data, I must only reply with 'No information available'.`

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
          model: "gpt-4-turbo", //gpt-4-0125-preview or gpt-3.5-turbo-0125
          messages,
          temperature: 0.7,
          max_tokens: 1200
        }),
      })
      .then(response => response.json())
      .then(json => {
        if (json.error) {
          console.error('GPT API error:', json.error);
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
      userID: req.session.user.id,
      albumCover: coverUrl,
      credits: credits,
      backgroundResults,
      dominantColor,
      inNav
    });
  } catch (error) {
    console.error('Catch error:', error);
    res.render('background', {
      error: `An error occurred: ${error.message}`,
      userID: req.session.user.id,
      backgroundResults: [], // Ensure the template can handle an empty array
      dominantColor,
      inNav
    });
  }
});

// Client sends information from analysis page to database
app.post('/save-analysis', async (req, res) => {
  const {title, artist, album, albumCover, analysisResults, userID, dominantColor, spotifyUri} = req.body;
  console.log("Received for saving:", req.body);

  const serializedAnalysis = JSON.stringify(analysisResults);
  try{
    const insertQuery = `INSERT INTO analysis(title, artist, album, "albumCover", def_analysis, 
    user_id, "dominantColor", "spotifyUri") VALUES($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (title, artist, album, user_id) DO UPDATE
    SET def_analysis = EXCLUDED.def_analysis;
    `;
  const result = await db.query(insertQuery, [title, artist, album, albumCover, serializedAnalysis, userID, dominantColor, spotifyUri]);
  res.json({status: 'success', message: 'Analysis saved successfully'});
} catch (error) {
  console.error('Error saving analysis, please try again', error);
  res.status(500).json({status: 'error', message: 'Failed to save analysis'});
};
});

// Client sends information from background page to database
app.post('/save-background', async (req, res) => {
  console.log("Received credits: ", req.body.credits);
  const {title, artist, album, albumCover, backgroundResults, userID, dominantColor, spotifyUri, credits} = req.body;

  const serializedBackground = JSON.stringify(backgroundResults);
  const savedCredits = JSON.stringify(credits);
  try{
    const insertQuery = `INSERT INTO analysis(title, artist, album, "albumCover", hist_analysis, 
    user_id, "dominantColor", "spotifyUri", "credits") VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (title, artist, album, user_id) DO UPDATE
    SET hist_analysis = EXCLUDED.hist_analysis;
    `;
  console.log("Saving credits: ", savedCredits);
  await db.query(insertQuery, [title, artist, album, albumCover, serializedBackground, userID, dominantColor, spotifyUri, savedCredits]);
  res.json({status: 'success', message: 'Background saved successfully'});
} catch (error) {
  console.error('Error saving background, please try again', error);
  res.status(500).json({status: 'error', message: 'Failed to save background'});
};
});

app.get('/account_analyses', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  try{
    const userID = req.session.userId;

    console.log("User ID:", userID);
    const query = 'SELECT title, artist, album, "albumCover" FROM analysis WHERE user_id = $1';
    const analysisResults = await db.query(query, [userID]);
    console.log(analysisResults)
    res.render('account_analyses', {analysisResults, userID: userID});
  }
  catch(error){
    console.error('Error fetching saved artists', error);
    res.status(500).send('Server error');
  }
})

// Loads the analysis page from database
app.get('/saved-analysis', async (req, res) => {
  const inNav = true;
  const { title, artist, album, userID } = req.query;
  console.log("Received parameters: ", req.query);

  if (!title || !artist || !album || !userID){
    return res.status(400).send('Missing parameters from analysis');
  }
  try{
    const query = 'SELECT * FROM analysis WHERE title = $1 AND artist = $2 AND album = $3 AND user_id = $4';
    const result = await db.query(query, [title, artist, album, userID]);
    console.log("Query result:", result);

    const {albumCover, dominantColor, def_analysis: serializedAnalysis, spotifyUri} = result[0];
    const analysisResults = JSON.parse(serializedAnalysis);

    res.render('saved_analysis', {
      title,
      artist,
      album,
      userID,
      analysisResults,
      albumCover,
      dominantColor,
      spotifyUri,
      inNav
    });
  }
  catch(error){
  console.error('Failed to fetch saved analysis:', error);
  res.status(500).send('Failed to retrieve saved analysis');
}
});

// Loads the background page from database
app.get('/saved-background', async (req, res) => {
  const inNav = true;
  const { title, artist, album, userID } = req.query;
  console.log("Received parameters:", title, artist, album, userID)

  if (!title || !artist || !album || !userID){
    return res.status(400).send('Missing parameters from analysis');
  }
  try{
    const query = 'SELECT * FROM analysis WHERE title = $1 AND artist = $2 AND album = $3 AND user_id = $4';
    const result = await db.query(query, [title, artist, album, userID]);
    console.log("Retrieved credits: ", result[0]);
    console.log("Query result:", result);

    const {albumCover, dominantColor, hist_analysis: serializedBackground, spotifyUri, credits} = result[0];
    const backgroundResults = JSON.parse(serializedBackground);

    res.render('saved_background', {
      title,
      artist,
      album,
      userID,
      backgroundResults,
      albumCover,
      dominantColor,
      spotifyUri,
      credits: JSON.parse(credits),
      inNav
    });
  }
  catch(error){
  console.error('Failed to fetch saved background:', error);
  res.status(500).send('Failed to retrieve saved background');
}
});



async function fetchSpotifyAlbumCovers(cleanedTitle, cleanedArtist) {
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

const getDominantColor = async (albumCover) => {
  return new Promise((resolve, reject) => {
    const vibrant = new Vibrant(albumCover, {
      colorCount: 256, // Adjusted for broader analysis
      quality: 50, // Lower quality might help group similar colors
      // Additional configurations could be added here
    });

    vibrant.getPalette((err, palette) => {
      if (err) {
        reject(err);
        return;
      }

      let dominantColor = palette.Vibrant.getHex();

      // Convert hex to RGB
      const rgb = hexToRgb(dominantColor);

      // Check if the color is close to grayscale
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      if (max - min <= 15) {  // Adjust this threshold as needed
        // If it's close to grayscale, change the dominant color to white
        dominantColor = '#d3d3d3';  // You mentioned light grey earlier; correcting that here
      }

      resolve(dominantColor);
    });
  });
};

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}


app.get('/loading', async (req, res) => {
  const { redirectUrl } = req.query;
  console.log('Redirect URL:', redirectUrl);

  const decodedRedirectUrl = decodeURIComponent(redirectUrl);
  const urlObj = new URL(decodedRedirectUrl, `http://${req.headers.host}`);
  const albumCover = urlObj.searchParams.get('albumCover');
  console.log('Album Cover:', albumCover);

  try {
    const dominantColor = await getDominantColor(albumCover);
    console.log('Dominant Color:', dominantColor);

    // If redirectUrl changes or is adjusted, ensure albumCover is included
    let finalRedirectUrl = urlObj.toString();
    // Example: finalRedirectUrl could be modified here based on some logic

    // Render the loading page with albumCover and dominantColor, and pass the finalRedirectUrl
    res.render('loading', { redirectUrl: finalRedirectUrl, albumCover, dominantColor });
  } catch (error) {
    console.error('Error processing album cover:', error);
    res.status(500).send('Failed to process album cover.');
  }
});


//Render forgotpassword page
app.get('/forgotpassword', (req, res) => {
  res.render('forgotpassword');
});

//Reset Password
app.post('/forgotpassword', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const existingUser = await db.oneOrNone("SELECT * FROM users WHERE username = $1 and email = $2", [username, email]);
      if (existingUser) {
        const hash = await bcrypt.hash(password, 10);
        await db.any("update users set password = $1 where username = $2 and email = $3 returning * ;", [hash, username, email]);
        res.redirect('resetsuccess');
      }
      else{
        console.error("Error during registration:", error);
        res.render('accountnotfound');
      }
    } catch (error) {
      console.error("Error during registration:", error);
      res.render('accountnotfound');
    }
});

//Render accountnotfound page
app.get('/accountnotfound', (req, res) => {
  res.render('accountnotfound');
});

//Render resetsuccess page
app.get('/resetsuccess', (req, res) => {
  res.render('resetsuccess');
});


const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("login");
  }
  next();
};

app.use(auth);

// Handle logout action
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.render('logout');
});


app.get('/accountinformation', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const { username, email } = req.session.user;
  res.render('accountinformation', { username, email });
});
//update username and email
app.post('/accountinformation', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const {newUsername, newEmail, currentPassword, newPassword, confirmNewPassword } = req.body;
  // const { newUsername, newEmail } = req.body;

  try {
    // Update the username in the session
    if(newUsername){
      req.session.user.username = newUsername;
      const existingUser = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [newUsername]);
      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists. Please choose a different username.",
        });
      }
      else{
        const updateQueryUsername = 'UPDATE users SET username = $1 WHERE id = $2';
        const userId = req.session.user.id;
        await db.none(updateQueryUsername, [newUsername, userId]);
      }
    }
    if(newEmail){
      req.session.user.email = newEmail;
      const updateQueryEmail = 'UPDATE users SET email = $1 WHERE id = $2';
      const userId = req.session.user.id;
      await db.none(updateQueryEmail, [newEmail, userId]);

    }
    if(newPassword){
      // Check if the new password and confirm new password match
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({
          message: "New password and confirm new password do not match.",
        });
      }
      // Retrieve user from the database
      const user = await db.oneOrNone("SELECT * FROM users WHERE id = $1", [req.session.user.id]);
      if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({
          message: "Current password is incorrect.",
        });
      }
      else{
        // Hash the new password
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      // Update user information in the session
      req.session.user.username = newUsername;
      req.session.user.email = newEmail;

      // Update user information in the database
      await db.none('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.session.user.id]);
      }
      return res.redirect('logout')
    }
    console.log('User information updated successfully');

    // Input validation
    // if (!currentPassword || !newPassword || !confirmNewPassword) {
    //   return res.status(400).json({
    //     message: "All fields are required.",
    //   });
    // }

    // Redirect the user back to the account information page
    res.redirect('/accountinformation');
  } catch (error) {
    console.error('Error updating user information:', error);
    res.status(500).send('Error updating user information');
  }
});



// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).send('Sorry, that page does not exist!');
});

const PORT = process.env.PORT || 3000;
module.exports = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));