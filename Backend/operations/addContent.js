// WARNING: TODO: Add admin restriction to this file
const axios = require("axios");
// Models
const Artist = require("../models/artistModel");
const Track = require("../models/trackModel");
const Album = require("../models/albumModel");
// Spotify API functions
const {
    getAlbumFromSpotify,
    getTrackFromSpotify,
    getArtistFromSpotify,
} = require("../controllers/spotifyApiController");

// Adds new artist to the database. If it already exists in MongoDB returns the existing artist
const getArtist = async (spotifyID) => {
    try {
        // If the artist exsits, return it
        let existingArtist = await Artist.findOne({ spotifyID });
        if (existingArtist) {
            return existingArtist._id;
        }

        // Else create new artist.
        const artistInfo = await getArtistFromSpotify(spotifyID, 1);
        // If the artist has missing information, pass it
        if (!artistInfo) {
            return null;
        }
        const { name, genres, popularity, spotifyURL, imageURL } = artistInfo;

        const newArtist = await Artist.create({
            name,
            genres,
            popularity,
            spotifyID,
            spotifyURL,
            imageURL,
            albums: [],
        });

        return newArtist._id;
    } catch (err) {
        throw err;
    }
};

// Assumes the album and artist have already been added to the database
// Session may be added here
const getTrack = async (spotifyID, albumID) => {
    try {
        // If the song is already added, return
        const existingTrack = await Track.findOne({ spotifyID });
        if (existingTrack) {
            console.log("This track has already been added to the database");
            return existingTrack._id;
        }

        const trackInformation = await getTrackFromSpotify(spotifyID);
        // If there is an error while getting the track return
        if (!trackInformation) {
            return;
        }
        console.log(trackInformation);
        // Organize necessary information to create a new track document
        const { name, popularity, durationMS, spotifyURL, previewURL } =
            trackInformation.otherInfo;
        console.log(`Processing track:${name}`);
        const trackArtists = trackInformation.artistInfo.artists;

        // Check if artists exist in database, if they do not exist, add them to the database
        let artists = [];
        for (let i = 0; i < trackArtists.length; i++) {
            const artistSpotifyID = trackArtists[i].artistID;
            const artistID = await getArtist(artistSpotifyID);
            if (artistID) {
                artists.push(artistID);
            }
        }

        // Create new track
        const newTrack = await Track.create({
            name,
            popularity,
            durationMS,
            album: albumID,
            artists,
            spotifyID,
            spotifyURL,
            previewURL,
        });

        return newTrack._id;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

// Returns an album if it exists in the database, else, adds it and returns.
// Returns the Album ID.
// Returns null if there is an error getting the album.
// If you already know that the album does not exist in database, set checkExistance = false
module.exports.getAlbumWithSpotifyID = async (spotifyID, checkExistance) => {
    try {
        // Return if the album exist in database
        if (checkExistance) {
            const existingAlbum = await Album.findOne({ spotifyID });
            if (existingAlbum) {
                return existingAlbum._id;
            }
        }

        const albumInformation = await getAlbumFromSpotify(spotifyID);
        if (!albumInformation) {
            return;
        }

        const {
            name,
            releaseDate,
            totalTracks,
            genres,
            albumArtists,
            trackIDs,
            spotifyURL,
            imageURL,
        } = albumInformation;

        // Check if artists exist in database, if they do not exist, add them to the database
        let artists = [];
        for (let i = 0; i < albumArtists.length; i++) {
            const artistSpotifyID = albumArtists[i].artistID;
            const artistID = await getArtist(artistSpotifyID);
            if (artistID) {
                artists.push(artistID);
            }
        }

        // Initialize the album
        const newAlbum = await Album.create({
            name,
            releaseDate,
            totalTracks,
            genres,
            artists,
            tracks: [],
            spotifyID,
            spotifyURL,
            imageURL,
        });

        // Add all tracks in the album
        const albumID = newAlbum._id;
        for (let i = 0; i < trackIDs.length; i++) {
            const trackSpotifyID = trackIDs[i];
            const trackID = await getTrack(trackSpotifyID, albumID);
            if (trackID) {
                newAlbum.tracks.push(trackID);
            }
        }

        newAlbum._id = albumID;
        await newAlbum.save();

        // Add album to artists' albums
        for (let artistID of artists) {
            const newArtist = await Artist.findById(artistID);
            newArtist.albums.push(albumID);
            newArtist.save();
        }

        return newAlbum._id;
    } catch (err) {
        console.error(err);
        return;
    }
};

// Returns the Artist ID.
// Returns null if there is an error getting the artist.
// Adds artist and its "albumCount" number of albums to the database
module.exports.getArtistWithSpotifyID = async (spotifyID, albumCount) => {
    try {
        const artistInformation = await getArtistFromSpotify(
            spotifyID,
            albumCount
        );
        if (!artistInformation) {
            return;
        }

        const { albums } = artistInformation;

        for (let albumSpotifyID of albums) {
            // Add album to the database
            const newAlbum = await this.getAlbumWithSpotifyID(
                albumSpotifyID,
                true
            );
        }

        // Find the artist and return it
        const artist = await Artist.findOne({ spotifyID });
        return artist;
    } catch (err) {
        console.error(err);
        return;
    }
};

module.exports.addNewArtist = async (req, res) => {
    try {
        const { spotifyID, albumCount } = req.body;
        const artist = await this.getArtistWithSpotifyID(spotifyID, albumCount);

        return res.status(201).json({
            message: "Success!",
            artist,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Add New Artist Failed!",
            success: false,
        });
    }
};

// Adds an album to the database, designed to be endpoint
module.exports.addNewAlbum = async (req, res) => {
    try {
        const { spotifyID } = req.body;
        // Throw error if the album exist in database
        const existingAlbum = await Album.findOne({ spotifyID });
        if (existingAlbum) {
            return res.status(500).json({
                message: `Album already exists in database! ID: ${spotifyID}`,
                success: false,
            });
        }

        const albumInformation = await getAlbumFromSpotify(spotifyID);
        if (!albumInformation) {
            return res.status(500).json({
                message: `Unable to find album with ID: ${spotifyID}`,
                success: false,
            });
        }
        console.log(albumInformation);

        const {
            name,
            releaseDate,
            totalTracks,
            genres,
            albumArtists,
            trackIDs,
            spotifyURL,
            imageURL,
        } = albumInformation;

        // Check if artists exist in database, if they do not exist, add them to the database
        let artists = [];
        for (let i = 0; i < albumArtists.length; i++) {
            const artistSpotifyID = albumArtists[i].artistID;
            const artistID = await getArtist(artistSpotifyID);
            if (artistID) {
                artists.push(artistID);
            }
        }

        // Initialize the album
        const newAlbum = await Album.create({
            name,
            releaseDate,
            totalTracks,
            genres,
            artists,
            tracks: [],
            spotifyID,
            spotifyURL,
            imageURL,
        });

        // Add all tracks in the album
        const albumID = newAlbum._id;
        for (let i = 0; i < trackIDs.length; i++) {
            const trackSpotifyID = trackIDs[i];
            const trackID = await getTrack(trackSpotifyID, albumID);
            if (trackID) {
                newAlbum.tracks.push(trackID);
            }
        }

        newAlbum._id = albumID;
        await newAlbum.save();

        return res.status(201).json({
            message: "Added album succesfully!",
            success: true,
            newAlbum: newAlbum,
        });
    } catch (err) {
        console.error(err);
        return res
            .status(500)
            .json({ message: "Internal Server Error", success: false });
    }
};
