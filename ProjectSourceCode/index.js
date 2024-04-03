const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');

const app = express();

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

app.get('/create', (req, res) => {
  res.render('create'); // This assumes that you have a 'home.hbs' file in your views/pages directory
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

app.get('/analysis', (req, res) => {
  const { title, artist, album } = req.query;

  res.render('analysis', {
    title: decodeURIComponent(title),
    artist: decodeURIComponent(artist),
    album: decodeURIComponent(album)
  });
});


// Handle login form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Here, you would handle the authentication logic.
  // For example, check username and password against a database.
  // If authentication is successful, redirect to another page, otherwise render login with an error message.
});

// Handle logout action
app.get('/logout', (req, res) => {
  // Here, you would handle the logout logic.
  // For example, destroying the session.
  res.redirect('/login'); // Redirect users to the login page after logging out.
});

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).send('Sorry, that page does not exist!');
});

// Set the app to listen on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




