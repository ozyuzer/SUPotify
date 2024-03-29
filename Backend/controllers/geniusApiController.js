const cheerio = require('cheerio');
const axios = require("axios");

const geniusAccessToken = process.env.GENIUS_ACCESS_TOKEN;

module.exports.getLyricsOfASong = async (req, res) => {
  try {
    async function searchSong(songName, artistName) {
      try {
        const response = await axios.get(`https://api.genius.com/search?q=${encodeURIComponent(songName)} ${encodeURIComponent(artistName)}`, {
          headers: {
            Authorization: `Bearer ${geniusAccessToken}`
          }
        });

        if (response.data.response.hits.length > 0) {
          const songId = response.data.response.hits[0].result.id;
          const lyricsResponse = await axios.get(`https://api.genius.com/songs/${songId}`, {
            headers: {
              Authorization: `Bearer ${geniusAccessToken}`
            }
          });

          if (lyricsResponse.data.response.song) {
            const lyricsState = lyricsResponse.data.response.song.lyrics_state;
            if (lyricsState === 'complete' || lyricsState === 'verified') {
              const lyricsURL = lyricsResponse.data.response.song.url;
              return lyricsURL;
            } else {
              throw new Error(`Lyrics for "${songName}" by ${artistName} are not available.`);
            }
          } else {
            throw new Error(`Lyrics not found for "${songName}" by ${artistName}`);
          }
        } else {
          throw new Error(`Song not found for "${songName}" by ${artistName}`);
        }
      } catch (error) {
        throw error; // Pass the error to be caught later
      }
    }

    async function fetchLyrics(url) {
      try {
        let { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let lyrics = $('div[class="lyrics"]').text().trim();
        if (!lyrics) {
          lyrics = '';
          $('div[class^="Lyrics__Container"]').each((i, elem) => {
            if ($(elem).text().length !== 0) {
              let snippet = $(elem)
                .html()
                .replace(/<br>/g, '\n')
                .replace(/<(?!\s*br\s*\/?)[^>]+>/gi, '');
              lyrics += $('<textarea/>').html(snippet).text().trim() + '\n\n';
            }
          });
        }
        if (!lyrics) return null;
        return lyrics.trim();
      } catch (e) {
        throw e; // Pass the error to be caught later
      }
    }

    const { songName, artistName } = req.params;

    searchSong(songName, artistName)
      .then((lyricsUrl) => {
        fetchLyrics(lyricsUrl)
          .then((lyrics) => {
            if (lyrics) {
              res.status(200).json({
                lyrics,
                success: true,
              });
            } else {
              res.status(404).json({
                message: 'Lyrics not found for the specified song and artist.',
                success: false,
              });
            }
          })
          .catch((error) => {
            res.status(500).json({ message: 'Error fetching lyrics.', error });
          });
      })
      .catch((error) => {
        res.status(404).json({ message: 'Song or lyrics not found.', error });
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
