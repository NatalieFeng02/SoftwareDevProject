**Description:** 
  The purpose of this website it to allow users to search for songs, based on the artist or song name, then select a song. After selecting a song the user is given a real-time interpretation of the lyrics of that song. At the same time the user can listen to a preview of the song, and even click the background information to learn more about it. 

**Contributors:**
  Daniel Busch, Lydia Clark, Natalie Feng, Charles Keely, Gabriel Vitti, and Maxwell Buchalski

**Technology Stack:**
  Utilizes Postgress SQL, Spotify API, ChatGPT API, and Lyrics.ovh API. 

**Prerequisites:**
  Need to have docker installed on your local machine in order to run the application.

**How to run:**
  Simply do docker compose up --build and start the docker containers. After this enter http://localhost:3000/ into your search bar the website will begin working. After session is complete make sure to do docker compose down -v to close docker out. 

  In order to fully use this app, an environmental file (.env) must be created on your local device. This can be done by navigating to the root directory of the project (ProjectSourceCode), creating a new file called ".env", then opening this with a text editor of your choice. The following fields should be created and filled:

  POSTGRES_USER="username_of_your_choice"
  
  POSTGRES_PASSWORD="password_of_your_choice"
  
  POSTGRES_DB="name_of_your_choice"

  SESSION_SECRET="secret phrase of your choice"

  OPENAI_API_KEY= XXX
  
  SPOTIFY_CLIENT_ID= XXX
  
  SPOTIFY_CLIENT_SECRET= XXX

  To obtain these last three fields, please visit the respective OpenAI and Spotify developer sites found below to sign up and request a key. Please note that a token limit exists with the ChatGPT API and may therefore be limited by the number of uses. These limits can be increased with a paid version of the API.
  
  https://platform.openai.com/signup
  
  https://developer.spotify.com/dashboard/

**Tests:**
  These tests check some basic functionalities of the app. This automatically runs after launching docker, but may need to be launched a second time as the database needs to initialize. This tests the account registration, checking that a user already exists, page rendering, and whether or not an unauthorized user (Not logged in) can access the search/results page.
  
**Link:**
   http://localhost:3000/ 
