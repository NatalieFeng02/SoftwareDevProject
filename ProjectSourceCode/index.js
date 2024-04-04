require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;
console.log(apiKey);

const OpenAI = require('openai');
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');

const fetch = require('node-fetch');

const app = express();

const openai = new OpenAI(apiKey);

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

app.get('/login', (req, res) => {
  res.render('login');
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


app.get('/create', (req, res) => {
  res.render('create');
});

app.post('/create', async (req, res) => {
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  var insertUser = `INSERT INTO users(username, password) VALUES ($1, $2)`;

  let response = await db.query(insertUser, [username, hash]);

  if(response.err)
  {
    return res.redirect('/create');
  }
  else
  {
    return res.redirect('/login');
  }
});
// Define routes
app.get('/search', (req, res) => {
  res.render('search'); // This will render the search.hbs template located in views/pages
});

app.get('/results', (req, res) => {
  console.log(req.query);
  const searchQuery = req.query.searchQuery || ''; // Get the search query from the URL parameter

  const songData = [
    { title: 'Five Years', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    { title: 'Soul Love', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
    
  ];

  const itemsPerPage = 8; // Set the number of items per page
  const page = req.query.page || 1; // Get the current page number from the query string, defaulting to 1
  const totalItems = songData.length; // This should be the total number of items from your data source

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Determine the slice of data to return based on the current page
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = songData.slice(startIndex, endIndex);

  // Generate page numbers for pagination controls
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push({ number: i, isCurrent: i === Number(page) });
  }

  res.render('results', {
    searchQuery: searchQuery, // Pass the search term to the template
    searchResults: paginatedItems, // Only pass the slice of data for the current page
    pages: pageNumbers, // Pass the array of page numbers for pagination controls
    totalPages: totalPages, // Pass the total number of pages
    lastPageIsCurrent: Number(page) === totalPages, // Boolean to check if the last page is the current page
  });
});

// Display the login page
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/analysis', async (req, res) => {
  const { title, artist } = req.query;
  const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const prompt = `Conclude your analysis in a complete sentence in 180 tokens or less. This is a section of the lyrics from "${title}" by "${artist}". Do not tell me what song the lyrics are from or who wrote it; I already know. Give me interesting information about this section of the lyrics:  It could be analysis of the meaning, it could be historical context or context to the artist, it could be analysis of the literary devices used, it could be a story behind the lyrics... Just make it interesting.`;
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

    res.render('analysis', {
      title: decodeURIComponent(title),
      artist: decodeURIComponent(artist),
      album: decodeURIComponent(req.query.album),
      analysisResults // Pass the array of lyrics and analyses
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





