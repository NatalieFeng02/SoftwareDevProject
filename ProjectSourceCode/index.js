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

// Define routes
app.get('/search', (req, res) => {
  res.render('search'); // This will render the search.hbs template located in views/pages
});

app.get('/results', (req, res) => {
  console.log(req.query);
  const searchQuery = req.query.searchQuery || ''; // Get the search query from the URL parameter

  const dummyData = [
    { title: 'Five Years', artist: 'David Bowie', album: 'Ziggy Stardust and the Spiders From Mars', albumCover: '/img/ZiggyStardust.png' },
  ];

  res.render('results', {
    searchQuery: searchQuery, // Pass the search term to the template
    searchResults: dummyData // Replace with real data from the iTunes API
  });
});

// Display the login page
app.get('/login', (req, res) => {
  res.render('login');
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


