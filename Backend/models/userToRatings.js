const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userToRatings = new Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
    },
    // Lists that keep all ratings of the user
    trackRatings: [
        {
            trackID: {
                type: String,
                ref: "Track",
            },
            rating: Number,
            ratedAt: Date,
        },
    ],
    albumRatings: [
        {
            albumID: {
                type: String,
                ref: "Album",
            },
            rating: Number,
            ratedAt: Date,
        },
    ],
    artistRatings: [
        {
            artistID: {
                type: String,
                ref: "Artist",
            },
            rating: Number,
            ratedAt: Date,
        },
    ],
});

module.exports = mongoose.model("userToRatings", userToRatings);
