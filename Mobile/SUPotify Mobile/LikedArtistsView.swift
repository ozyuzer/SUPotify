//
//  LikedArtistsView.swift
//  SUPotify Mobile App
//
//  Created by Alkım Özyüzer on 8.12.2023.
//

import SwiftUI

struct LikedArtistsView: View {
  @EnvironmentObject var viewModel: LikedSongsViewModel

    var body: some View {
      ForEach(viewModel.likedArtists, id: \._id){ artist in
        //let artists = song.artists.map { $0.name }.joined(separator: ", ")
        let artistImageURL = artist.imageURL
        HStack{
          LImage_RText(contentID: artist._id, contentType: "ARTIST", songName: artist.name, artistNames: "", imageURL: artistImageURL, isPlaylist: false).environmentObject(SharedViewModel.shared)
          Spacer()
        }
      }
    }
}

#Preview {
  LikedArtistsView().preferredColorScheme(/*@START_MENU_TOKEN@*/.dark/*@END_MENU_TOKEN@*/)
}
