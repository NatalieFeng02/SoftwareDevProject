Description: 
  The purpose of this website it to allow users to search for songs, based on the artist or song name, then select a song. After selecting a song the user is given a real-time interpretation of the lyrics of that song. At the same time the user can listen to a preview of the song, and even click the background information to learn more about it. 

Contributors:
  Daniel Busch, Lydia Clark, Natalie Feng, Charles Keely, Gabriel Vitti, and Maxwell Buchalski

Technology Stack:
  Utilizes Postgress SQL, Spotify API, ChatGPT API, and Lyrics.ovh API. 

Prerequisits:
  Need to have docker installed on your local machine in order to run the application.

How to run:
  Simply do docker compose up --build and start the docker containers. After this enter http://localhost:3000/ into your search bar the website will begin working. After session is complete make sure to do docker compose down -v to close docker out. 

Tests:
  These tests check some basic functionalities of the app. This automatically runs after launching docker, but may need to be launched a second time as the database needs to initialize. This tests the account registration, checking that a user already exists, page rendering, and whether or not it handles 404s correctly
  
Link:
   http://localhost:3000/ 
