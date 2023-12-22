import SwiftUI
import Charts

struct TopRatedTracksRequest: Codable {
  let filters: Filters
  let numItems: Int
}

struct Filters: Codable {
  let rateDate: [String]
  let releaseDate: [String]
  let genres: [String]
  let artists: [String]
}

struct TopRatedTracksResponse: Codable {
  var message: String
  var success: Bool
  var trackRatings: [TrackRating]
  // var genreToRating: Genrer
  // var artistToRating: Artistr
  // var eraToRating:

  struct TrackRating: Codable {
    var track: Track
    var rating: Int
    var ratedAt: String
    var _id: String
    struct Track: Codable {
      var _id: String
      var name: String
      var popularity: Int
      var durationMS: Int
      //var album: Album
      //var artists: Artist
      var spotifyID: String
      var spotifyURL: String
      var previewURL: String?
      var __v: Int
    }
    /*
     struct Album: Codable {
     var _id: String
     var name: String
     var releaseDate: String
     var imageURL: String
     }

     struct Artist: Codable {
     var _id: String
     var name: String
     var genres: [String]
     var popularity: Int
     var spotifyURL: String
     var imageURL: String
     }*/
  }
}

struct HomeView: View {
  @StateObject var homeViewModel = HomeViewModel() // ViewModel instance
  @State private var selectedTab: StatisticCategory = .tracks
  // @State private var startDate: Date = Calendar.current.date(byAdding: .year, value: -1, to: Date()) ?? Date()
  //   @State private var endDate: Date = Date()



  // State variables for the start date picker
  @State private var startMonth: Int = Calendar.current.component(.month, from: Date())
  @State private var startYear: Int = Calendar.current.component(.year, from: Date())
  @State private var startDateAsString: String = ""

  // State variables for the end date picker
  @State private var endMonth: Int = Calendar.current.component(.month, from: Date())
  @State private var endYear: Int = Calendar.current.component(.year, from: Date())
  @State private var endDateAsString: String = ""

  @State private var genre: String = "" // Provide a default value
  @State private var artists: String = "" // Provide a default value
  @State private var selectedOption: String = "Ranking based"
  let username = SessionManager.shared.username
  let userToken = SessionManager.shared.token
  let options = ["Ranking based", "Liked Songs based"]

  var body: some View {
    ZStack{
      BackgroundView()
      VStack {
        CategoryPicker(selectedTab: $selectedTab)

        //DatePickerRange(startDate: $startDate, endDate: $endDate)
        HStack {
          MonthYearPicker(selectedMonth: $startMonth, selectedYear: $startYear, selectedDateAsString: $startDateAsString)
          MonthYearPicker(selectedMonth: $endMonth, selectedYear: $endYear, selectedDateAsString: $endDateAsString)
        }

        HStack{
          TextField("Genre", text: $genre)
            .textFieldStyle(RoundedBorderTextFieldStyle())
            .padding()
            .font(.subheadline)
          TextField("Artist", text: $artists)
            .textFieldStyle(RoundedBorderTextFieldStyle())
            .padding()
            .font(.subheadline)
        }

        Menu {
          ForEach(options, id: \.self) { option in
            Button(option) {
              selectedOption = option
            }
          }
        } label: {
          Text("Select Option: \(selectedOption)")
            .foregroundColor(.white)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(5)
            .font(.subheadline)
        }
        .padding()

        switch selectedTab {
        case .tracks:
          //NavigationView{
            TracksStatisticsView(startDateAsString: $startDateAsString, endDateAsString: $endDateAsString, genre: genre, artists: artists, numItems: 10, homeViewModel: homeViewModel)
              //.foregroundColor(Color.clear)
         // }.background(Color.indigo)

        case .albums:
          AlbumsStatisticsView(startDateAsString: $startDateAsString, endDateAsString: $endDateAsString, genre: genre, artists: artists)
        case .artists:
          ArtistsStatisticsView(startDateAsString: $startDateAsString, endDateAsString: $endDateAsString, genre: genre, artists: artists)
        }

        Spacer()
      }
      .padding()
      .navigationTitle("Welcome, \(username)").foregroundColor(.indigo)
      .navigationBarTitleDisplayMode(.automatic)
      .foregroundColor(.indigo)
    }
  }
}

class HomeViewModel: ObservableObject {
  @Published var topRatedTracksResponse: TopRatedTracksResponse?
  @Published var showBarChart = false

  func fetchTopRatedTracks(userToken: String, startDateAsString: String, endDateAsString: String, genre: String, artists: String, numItems: Int) {

    let requestBody = TopRatedTracksRequest(
      filters: Filters(
        rateDate: [startDateAsString, endDateAsString],
        releaseDate: [startDateAsString, endDateAsString],
        genres: genre.isEmpty ? [] : [genre],
        artists: artists.isEmpty ? [] : artists.components(separatedBy: ",") // Assuming you have a way to specify artists
      ),
      numItems: numItems
    )
    guard let url = URL(string: "http://localhost:4000/api/statistics/getTopRatedTracks") else { return }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.addValue("Bearer \(userToken)", forHTTPHeaderField: "Authorization")
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")

    do {
      request.httpBody = try JSONEncoder().encode(requestBody)
    } catch {
      print("Error encoding request body: \(error)")
      return
    }

    URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
      DispatchQueue.main.async {
        if let error = error {
          print("Error: \(error)")
          return
        }
        guard let data = data else {
          print("No data received")
          return
        }
        // Print raw JSON string for debugging
        if let json = String(data: data, encoding: .utf8) {
          print("Raw JSON response: \(json)")
        }
        do {
          let decodedResponse = try JSONDecoder().decode(TopRatedTracksResponse.self, from: data)
          self?.topRatedTracksResponse = decodedResponse
          self?.showBarChart = true
          //print(decodedResponse)
        } catch {
          print("Error decoding response: \(error)")
        }
      }
    }.resume()
  }
}


struct CategoryPicker: View {
  @Binding var selectedTab: StatisticCategory

  var body: some View {
    Picker("Statistics Type", selection: $selectedTab) {
      ForEach(StatisticCategory.allCases, id: \.self) { category in
        Text(category.rawValue).tag(category)
      }
    }
    .pickerStyle(SegmentedPickerStyle())
    .padding()

  }
}

struct BarChartView2: View {
    var trackRatings: [TopRatedTracksResponse.TrackRating]
    @State private var barWidths: [String: CGFloat] = [:]

    // Sorting the track ratings by rating in descending order
    var sortedTrackRatings: [TopRatedTracksResponse.TrackRating] {
        trackRatings.sorted { $0.rating > $1.rating }
    }

    var body: some View {
      ZStack {
        BackgroundView()
        VStack(alignment: .leading) {
              Text("Top Rated Tracks")
                  .font(.headline)
                  .padding()

              // Creating rows for each track rating
              ForEach(sortedTrackRatings, id: \.track._id) { trackRating in
                  HStack(alignment: .center) {
                      Text(trackRating.track.name)
                          .font(.caption)
                          .frame(width: 100, alignment: .leading)

                      // Using GeometryReader to animate the bar's width
                      GeometryReader { geometry in
                          HStack {
                              Rectangle()
                                  .fill(trackRating.rating > 3 ? Color.blue : Color.red)
                                  .frame(width: self.barWidths[trackRating.track._id, default: 0], height: 20)
                                  .onAppear {
                                      withAnimation(.easeOut(duration: 1.5)) {
                                          self.barWidths[trackRating.track._id] = CGFloat(trackRating.rating) / CGFloat(sortedTrackRatings.first?.rating ?? 1) * geometry.size.width
                                      }
                                  }
                              Spacer() // Pushes the bar to the left
                          }
                      }

                      // Displaying the rating value to the right of the bar
                      Text("\(trackRating.rating)")
                          .font(.caption)
                          .foregroundColor(.white)
                          .frame(width: 30, alignment: .center)
                  }
                  .frame(height: 30) // Fixed height for each row
              }
          }
        .padding(.horizontal)
      }
    }
}



/*

struct BarChartView2: View {
    var trackRatings: [TopRatedTracksResponse.TrackRating]

    // Sorting the track ratings by rating in descending order
    var sortedTrackRatings: [TopRatedTracksResponse.TrackRating] {
        trackRatings.sorted { $0.rating > $1.rating }
    }

  @State private var barWidths: [String: CGFloat] = [:]

    var body: some View {
        VStack(alignment: .leading) {
            Text("Top Rated Tracks")
                .font(.headline)
                .padding()

            // Use Chart if you are using SwiftUI Charts
            Chart(sortedTrackRatings) { trackRating in
                BarMark(
                    x: .value("Track Name", trackRating.track.name),
                    y: .value("Rating", trackRating.rating)
                )
                .foregroundStyle(trackRating.rating > 3 ? Color.green : Color.red)
                .annotation(position: .top, alignment: .center) {
                    Text("\(trackRating.rating)")
                        .font(.caption)
                        .foregroundColor(.white)
                }
            }
            .chartYAxis(.hidden)
        }
        .padding(.horizontal)
    }
}

*/

struct BarChartView: View {

  var trackRatings: [TopRatedTracksResponse.TrackRating] = [
    TopRatedTracksResponse.TrackRating(track: TopRatedTracksResponse.TrackRating.Track(_id: "1", name: "Song A", popularity: 80, durationMS: 200000, spotifyID: "sptfy1", spotifyURL: "https://spotify.com/track1", previewURL: nil, __v: 0), rating: 5, ratedAt: "2022-12-01T00:00:00Z", _id: "tr1"),
    TopRatedTracksResponse.TrackRating(track: TopRatedTracksResponse.TrackRating.Track(_id: "2", name: "Song B", popularity: 70, durationMS: 180000, spotifyID: "sptfy2", spotifyURL: "https://spotify.com/track2", previewURL: nil, __v: 0), rating: 4, ratedAt: "2022-12-02T00:00:00Z", _id: "tr2"),
          // Add more mock TrackRating items...
      ]

  //var trackRatings: [TopRatedTracksResponse.TrackRating]

  var sortedTrackRatings: [TopRatedTracksResponse.TrackRating] {
    trackRatings.sorted { $0.rating > $1.rating }
  }

  var body: some View {
    ZStack {
      BackgroundView()
      VStack {
        Text("Top Rated Tracks")
          .font(.headline)

        ForEach(sortedTrackRatings, id: \.track._id) { trackRating in
          HStack {
            Text(trackRating.track.name)
              .frame(width: 100, alignment: .leading)

            Rectangle()
              .fill(Color.blue)
              .frame(width: CGFloat(trackRating.rating) * 8, height: 30) // Adjust multiplier as needed
          }
        }
      }
      .padding()
    }
  }
}

#Preview {
  
  BarChartView()
    .preferredColorScheme(/*@START_MENU_TOKEN@*/.dark/*@END_MENU_TOKEN@*/)
}

struct DatePickerRange: View {
  @Binding var startDate: Date
  @Binding var endDate: Date


  var body: some View {
    VStack {
      DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
        .datePickerStyle(CompactDatePickerStyle())
        .font(.subheadline)
        .foregroundColor(.white)
      DatePicker("End Date", selection: $endDate, displayedComponents: .date)
        .datePickerStyle(CompactDatePickerStyle())
        .font(.subheadline)
        .foregroundColor(.white)
    }
    .padding(.horizontal)
  }
}

struct MonthYearPicker: View {
  @Binding var selectedMonth: Int
  @Binding var selectedYear: Int
  @Binding var selectedDateAsString: String

  private let months = Calendar.current.monthSymbols

  private var years: [Int] {
    let currentYear = Calendar.current.component(.year, from: Date())
    return Array(currentYear-20...currentYear+20) // Adjust range as needed
  }

  var body: some View {
    HStack {
      Picker("Month", selection: $selectedMonth) {
        ForEach(1...12, id: \.self) { month in
          Text(self.months[month - 1]).tag(month)
        }
      }
      .pickerStyle(WheelPickerStyle())
      .onChange(of: selectedMonth) { _ in updateDateAsString() }

      Picker("Year", selection: $selectedYear) {
        ForEach(years, id: \.self) { year in
          Text("\(year)").tag(year)
        }
      }
      .pickerStyle(WheelPickerStyle())
      .onChange(of: selectedYear) { _ in updateDateAsString() }
    }
  }

  private func updateDateAsString() {
    selectedDateAsString = "\(selectedYear)-\(selectedMonth)"
  }
}


enum StatisticCategory: String, CaseIterable {
  case tracks = "Tracks"
  case albums = "Albums"
  case artists = "Artists"
}

// Example Views for Each Category (Replace with actual content)
struct AlbumsStatisticsView: View {

  @Binding var startDateAsString: String
  @Binding var endDateAsString: String
  var genre: String
  var artists: String

  var body: some View {

    // Replace with your actual UI components for displaying albums statistics
    Button("Calculate") {
      let filters = Filters(
        rateDate: [startDateAsString, endDateAsString],
        releaseDate: [startDateAsString, endDateAsString],
        genres: [genre],
        artists: [artists]
      )
      let request = TopRatedTracksRequest(filters: filters, numItems: 10)
      //viewModel.fetchTopRatedTracks(userToken: userToken, requestBody: request)
    }
    .font(.subheadline)
    .padding()
    .background(.black.opacity(0.5))
    .foregroundColor(.white)
    .font(.caption2)
    .cornerRadius(8)
    Text("Albums statistics view")
      .font(.subheadline)
  }
}

struct TracksStatisticsView: View {
  @Binding var startDateAsString: String
  @Binding var endDateAsString: String
  var genre: String
  var artists: String
  var numItems: Int
  let userToken = SessionManager.shared.token
  @ObservedObject var homeViewModel: HomeViewModel
  @State private var navigateToBarChart = false

  var body: some View {
    VStack {
      Button("Calculate") {
        let filters = Filters(
          rateDate: [startDateAsString, endDateAsString],
          releaseDate: [startDateAsString, endDateAsString],
          genres: [genre],
          artists: [artists]
        )
        let request = TopRatedTracksRequest(filters: filters, numItems: 10)
        homeViewModel.fetchTopRatedTracks(userToken: userToken, startDateAsString: startDateAsString, endDateAsString: endDateAsString, genre: genre, artists: artists, numItems: numItems)


        //self.showBarChart = true
      }.font(.subheadline)
        .padding()
        .background(.black.opacity(0.5))
        .foregroundColor(.white)
        .font(.caption2)
        .cornerRadius(8)


      NavigationLink(destination: BarChartView2(trackRatings: homeViewModel.topRatedTracksResponse?.trackRatings ?? []),
                     isActive: $navigateToBarChart) {
        //EmptyView()
      }
       .onReceive(homeViewModel.$showBarChart) { showChart in
         if showChart {
           self.navigateToBarChart = true

           DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
               homeViewModel.showBarChart = false
           }
         }
       }
      Spacer()
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity) // Fill the parent view
    .background(Color.clear) // Set the background color
    .edgesIgnoringSafeArea(.all) // Extend into the safe area
    // Add BarChartView here
  }


  var dateFormatter: DateFormatter {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM" // Adjust format as needed
    return formatter
  }
}

struct ArtistsStatisticsView: View {
  @Binding var startDateAsString: String
  @Binding var endDateAsString: String

  var genre: String
  var artists: String

  var body: some View {
    Button("Calculate") {
      let filters = Filters(
        rateDate: [startDateAsString, endDateAsString],
        releaseDate: [startDateAsString, endDateAsString],
        genres: [genre],
        artists: [artists]
      )
      let request = TopRatedTracksRequest(filters: filters, numItems: 10)
      //viewModel.fetchTopRatedTracks(userToken: userToken, requestBody: request)
    }
    .font(.subheadline)
    .padding()
    .background(.black.opacity(0.5))
    .foregroundColor(.white)
    .font(.caption2)
    .cornerRadius(8)

    Text("Artists statistics view")
      .font(.subheadline)
  }
}


extension TopRatedTracksResponse.TrackRating: Identifiable {
    public var id: String { self._id }
}


/*
#Preview {
  HomeView()
    .preferredColorScheme(/*@START_MENU_TOKEN@*/.dark/*@END_MENU_TOKEN@*/)
}
*/
