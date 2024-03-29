import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LikedContent.css';
import Navbar from './Navbar';
import { FaTrashAlt } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';

const LikedContent = () => {
  const [activeTab, setActiveTab] = useState('likedSongs');
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedArtists, setLikedArtists] = useState([]);
  const history = useHistory();

  const [isCardVisible, setIsCardVisible] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [artists, setArtists] = useState('');

  const [isCardOpen, setIsCardOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [filterInput, setFilterInput] = useState('');
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const [isMongoCardVisible, setIsMongoCardVisible] = useState(false);
  const [mongoURL, setMongoURL] = useState('');
  
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');  

  const token = localStorage.getItem('token');

  // Event handler for MongoDB URL input change
  const handleMongoURLChange = (e) => {
    setMongoURL(e.target.value);
  };

  // Event handler for MongoDB Connect button
  const handleMongoConnect = async () => {
    try {
      const response = await axios.post(
        'http://localhost:4000/api/likedContent/addTracksByMongoURL',
        { mongoURL },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Successfully added tracks by MongoDB URL!');
    } catch (error) {
      console.error('Error adding tracks by MongoDB URL:', error);
      toast.error('Failed to add tracks by MongoDB URL!');
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = 'Track Name,Album Name,Artist Names\n';
    csvContent += headers;

    filteredSongs.forEach(song => {
      const row = [
        song.track.name, 
        song.track.album.name, 
        song.track.artists.map(artist => artist.name).join(',')
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "liked_songs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFilterInputChange = (e) => {
    setFilterInput(e.target.value);
  };

  const applyFilter = () => {
    const lowercasedFilter = filterInput.toLowerCase();
    const filtered = likedSongs.filter(item => {
      return item.track.name.toLowerCase().includes(lowercasedFilter) ||
             item.track.artists.some(artist => artist.name.toLowerCase().includes(lowercasedFilter)) ||
             item.track.album.name.toLowerCase().includes(lowercasedFilter);
    });
    setFilteredSongs(filtered);
  };

  const resetFilter = () => {
    setFilteredSongs([]);
    setFilterInput('');
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const parseCSV = (text) => {
    const rows = text.split('\n');
    const headers = rows[0].split(',');
    return rows.slice(1).map(row => {
      const values = row.split(',');
      const entry = {};
      headers.forEach((header, index) => {
        entry[header.trim()] = values[index].trim();
      });
      return entry;
    });
  };  

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.warn('Please select a file.');
      return;
    }
  
    try {
      const fileReader = new FileReader();
      fileReader.readAsText(selectedFile, "UTF-8");
      fileReader.onload = async e => {
        try {
          const text = e.target.result;
          const data = parseCSV(text);
          console.log(data);
          const token = localStorage.getItem('token');
          const response = await axios.post(
            'http://localhost:4000/api/likedContent/addManyToLikedTracks', 
            { trackList: data }, 
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log(response.data); // Handle the response as needed
          toast.success(response.data.message);
          fetchLikedContent('TRACK');
        } catch (apiError) {
          console.error('Error sending data to the server:', apiError);
          toast.error('Error occurred while sending data to the server.');
        }
      };
      fileReader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast.error('Error reading the file.');
      };
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('An error occurred while processing the file.');
    }
  };
  

  const handleAddCustomSong = async () => {
    try {
      await axios.post('http://localhost:4000/api/likedContent/likeCustomTrack', {
        trackName, 
        albumName, 
        artists: artists.split(',').map(artist => artist.trim()) // Split by comma and trim spaces
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Custom song added successfully!");
      // Reset the form and hide the card

      fetchLikedContent('TRACK');

      setTrackName('');
      setAlbumName('');
      setArtists('');
      setIsCardVisible(false);
    } catch (error) {
      console.error('Error adding custom song:', error);
      toast.error('Error adding custom song');
    }
  };

  useEffect(() => {
    if (activeTab === 'likedSongs') {
      fetchLikedContent('TRACK');
      fetchUserPlaylists();
    } else if (activeTab === 'likedAlbums') {
      fetchLikedContent('ALBUM');
    } else if (activeTab === 'likedArtists') {
      fetchLikedContent('ARTIST');
    }
    // Add similar condition for likedArtists if needed
  }, [token, activeTab]);

  const goToSongDetails = (songId) => {
    history.push(`/song/${songId}`);
  };

  const goToAlbumDetails = (albumId) => {
    history.push(`/album/${albumId}`);
  };

  const goToArtistDetails = (artistId) => {
    history.push(`/artist/${artistId}`);
  };

  const fetchLikedContent = async (contentType) => {
    try {
      const response = await axios.get(`http://localhost:4000/api/likedContent/getLikedContent/${contentType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (contentType === 'TRACK') {
        setLikedSongs(response.data.likedContent);
      } else if (contentType === 'ALBUM') {
        setLikedAlbums(response.data.likedContent);
      } else if (contentType === 'ARTIST') {
        setLikedArtists(response.data.likedContent);
      }
      // Add similar condition for likedArtists if needed
    } catch (error) {
      console.error(`Error fetching liked ${contentType.toLowerCase()}:`, error);
    }
  };

  const fetchUserPlaylists = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/playlists/getUserPlaylists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setUserPlaylists(response.data.userToPlaylists.playlists);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const addTrackToPlaylist = async () => {
    try {
      await axios.post(
        'http://localhost:4000/api/playlists/addTrackToPlaylist',
        { playlistID: selectedPlaylistId, trackID: selectedTrackId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Track added to playlist successfully');
      setShowPlaylistModal(false);
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      toast.error('Failed to add track to playlist');
    }
  };

  const removeLikedContent = async (contentId, contentType, event) => {
    event.stopPropagation()
    try {
      const response = await axios.delete('http://localhost:4000/api/likedContent/removeFromLikedContent', {
        data: {
          contentID: contentId,
          contentType: contentType
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log(response);
      fetchLikedContent(contentType);
    } catch (error) {
      console.error('Error removing content:', error);
    }
  };

  return (
    <div>
      <Navbar/>
    <div className="liked-content">
      {/* Overlay */}
      <div className={showPlaylistModal ? 'overlay active' : 'overlay'} onClick={() => setShowPlaylistModal(false)}></div>
      {showPlaylistModal && (
        <div className="playlist-modal">
          <h2>Select a Playlist</h2>
          <select 
            value={selectedPlaylistId} 
            onChange={(e) => setSelectedPlaylistId(e.target.value)}
          >
            <option value="">Select a playlist</option>
            {userPlaylists.map(playlist => (
              <option key={playlist._id} value={playlist._id}>{playlist.name}</option>
            ))}
          </select>
          <button onClick={addTrackToPlaylist}>Add to Playlist</button>
          <button onClick={() => setShowPlaylistModal(false)}>Cancel</button>
        </div>
      )}
      <div className="tabs">
        <button onClick={() => setActiveTab('likedSongs')} className={activeTab === 'likedSongs' ? 'active' : ''}>Liked Songs</button>
        <button onClick={() => setActiveTab('likedAlbums')} className={activeTab === 'likedAlbums' ? 'active' : ''}>Liked Albums</button>
        <button onClick={() => setActiveTab('likedArtists')} className={activeTab === 'likedArtists' ? 'active' : ''}>Liked Artists</button>
      </div>
      <div className="tab-content">
        {activeTab === 'likedSongs' && (
          <div>
            <div className="add-custom-song">
              <button onClick={() => setIsCardVisible(!isCardVisible)}>Add Custom Song</button>
              {isCardVisible && (
                <div className="custom-song-card">
                  <input
                    type="text"
                    value={trackName}
                    onChange={(e) => setTrackName(e.target.value)}
                    placeholder="Track Name"
                  />
                  <input
                    type="text"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="Album Name"
                  />
                  <input
                    type="text"
                    value={artists}
                    onChange={(e) => setArtists(e.target.value)}
                    placeholder="Artists (comma separated)"
                  />
                  <button onClick={handleAddCustomSong}>Submit</button>
                </div>
              )}
            </div>
            <div className="add-tracks-by-file">
              <button onClick={() => setIsCardOpen(!isCardOpen)}>Add A File (.csv)</button>
              {isCardOpen && (
                <div className="upload-card">
                  <input type="file" onChange={handleFileChange} accept=".csv" />
                  <button onClick={handleSubmit}>Submit</button>
                </div>
              )}
            </div>
            <div className="add-by-mongo">
              <button 
                onClick={() => setIsMongoCardVisible(!isMongoCardVisible)}
                className="file-upload-button" // Assuming you have a CSS class for styling
              >
                Add by MongoDB
              </button>
              {isMongoCardVisible && (
                <div className="upload-card"> {/* Reuse the card styles */}
                  <input
                    type="text"
                    value={mongoURL}
                    onChange={handleMongoURLChange}
                    placeholder="MongoDB URL"
                  />
                  <button 
                    onClick={handleMongoConnect}
                    className="submit-button" // Assuming you have a CSS class for styling
                  >
                    Connect
                  </button>
                </div>
              )}
            </div>
            <h2 className='content-header'>Liked Tracks</h2>
            <button className="export-songs-button" onClick={exportToCSV}>
              Export Songs
            </button>
            {/* Filter Button and Card */}
            <button className="filter-songs-button" onClick={() => setIsFilterVisible(!isFilterVisible)}>Filter Songs</button>
            {isFilterVisible && (
              <div className="filter-card">
                <input
                  type="text"
                  value={filterInput}
                  onChange={handleFilterInputChange}
                  placeholder="Filter by name, artist, album"
                />
                <button onClick={applyFilter}>Apply Filter</button>
                <button onClick={resetFilter}>Reset</button>
              </div>
            )}
            <ul>
              {(filteredSongs.length > 0 ? filteredSongs : likedSongs).map(item => (
                <li key={item.track._id} onClick={() => goToSongDetails(item.track._id)}>
                  <img src={item.track.album.imageURL} alt={item.track.name} />
                  <div>
                    <p>{item.track.name}</p>
                    <p>Artist: {item.track.artists.map(artist => artist.name).join(', ')}</p>
                    <p>Album: {item.track.album.name}</p>
                    <a href={item.track.spotifyURL} target="_blank" rel="noopener noreferrer">Listen on Spotify</a>
                    <button
                      className="remove-content-button"
                      onClick={(event) => removeLikedContent(item.track._id, 'TRACK', event)}
                    >
                      <FaTrashAlt className="icon" />
                    </button>
                    <button 
                      onClick={(event) => {
                        event.stopPropagation(); // Prevents the event from bubbling up to parent elements
                        setShowPlaylistModal(true);
                        setSelectedTrackId(item.track._id);
                      }}
                    >
                      Add to Playlist
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'likedAlbums' && (
          <div>
            <h2>Liked Albums</h2>
            <ul>
              {likedAlbums.map(item => (
                <li key={item.album._id} onClick={() => goToAlbumDetails(item.album._id)}>
                  <img src={item.album.imageURL} alt={item.album.name} />
                  <div>
                    <p>{item.album.name}</p>
                    <p>Artist: {item.album.artists.map(artist => artist.name).join(', ')}</p>
                    <a href={item.album.spotifyURL} target="_blank" rel="noopener noreferrer">Listen on Spotify</a>
                    <button
                      className="remove-content-button"
                      onClick={(event) => removeLikedContent(item.album._id, 'ALBUM', event)}
                    >
                      <FaTrashAlt className="icon" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {activeTab === 'likedArtists' && (
          <div>
            <h2>Liked Artists</h2>
            <ul>
              {likedArtists.map(item => (
                <li key={item.artist._id} onClick={() => goToArtistDetails(item.artist._id)}>
                  <img src={item.artist.imageURL} alt={item.artist.name} />
                  <div>
                    <p>{item.artist.name}</p>
                    <p>Genres: {item.artist.genres.join(', ')}</p>
                    <a href={item.artist.spotifyURL} target="_blank" rel="noopener noreferrer">Listen on Spotify</a>
                    <button
                      className="remove-content-button"
                      onClick={(event) => removeLikedContent(item.artist._id, 'ARTIST', event)}
                    >
                      <FaTrashAlt className="icon" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default LikedContent;
