//
//  MainPage.swift
//  SUPotify Mobile
//
//  Created by Alkım Özyüzer on 28.10.2023.
//

import SwiftUI

struct MainMenu: View {
    var body: some View {
        TabView {
            // Tab 1
            Text("Home page")
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
            
            // Tab 2
            Text("Tab 2")
                .tabItem {
                    Image(systemName: "2.circle")
                    Text("Tab 2")
                }
            
            Text("For you")
                .tabItem {
                    Image(systemName: "heart.fill")
                    Text("For You")
                }
            
            // Liked Songs Tab
                NavigationView {
                    LikedSongsPage()
                }
                .tabItem {
                  Image(systemName: "hand.thumbsup.fill")
                    Text("Liked Songs")
                }
            
            
            // Profile Tab
                NavigationView {
                    Profile()
                }
                .tabItem {
                    Image(systemName: "person.crop.circle.fill")
                    Text("Profile")
                }
        }
        .font(.title)
        .navigationBarBackButtonHidden(true)

    }
}

struct MainMenu_Previews: PreviewProvider {
    static var previews: some View {
        MainMenu()
            .preferredColorScheme(.dark)
    }
}

