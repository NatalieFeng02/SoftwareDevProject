app.get('/results', async (req, res) => {

    if (!req.session.user) {
      return res.redirect('/login');
    }
  
    const userID = req.session.userId;
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