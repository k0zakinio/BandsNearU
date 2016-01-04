$(document).ready(function() {

  var positionData = {};
  var playing = false;

  // $('#load-track').click(function() {
  //   getLocation();
  // });

  function getLocation() { // Nb. Error handling has been removed
    return new Promise(function(resolve, reject) {
      navigator.geolocation.getCurrentPosition(function(position) {
        resolve(position);
      });
    });
  };

  function showPosition() {
    return new Promise(function(resolve, reject) {
      getLocation().then(function(position) {

        console.log('THE FIRST PROMISE: (see object below)');
        console.log(position);

        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        var geolocUrl = 'https://maps.googleapis.com/maps/api/geocode/json?&language=en&latlng=' + latitude + "," + longitude
                         '&key=AIzaSyAGWnWE0GeEPpCYmiy2mXZ9RnDGf_n3JQA';

        $.get(geolocUrl, function(response) {
          var results = response.results
          if (results[results.length-1].address_components[0].long_name === 'United Kingdom') {
            for (var result = 0; result < results.length; result++) {
              for (var component = 0; component < results[result].address_components.length; component++) {
                if(results[result].address_components[component].types.includes('postal_town')) {
                  cityName = convToParam(results[result].address_components[component].long_name);
                };
                if (results[result].address_components[component].types.includes('administrative_area_level_1')) {
                  country = convToParam(results[result].address_components[component].long_name);
                };
              };
            };
          } else {
            for (var result = 0; result < results.length; result++) {
              for (var component = 0; component < results[result].address_components.length; component++) {
                if(results[result].address_components[component].types.includes('locality')) {
                  cityName = convToParam(results[result].address_components[component].long_name);
                };
              };
            };
            country = convToParam(results[results.length-1].address_components[0].long_name);
          };
          countryCode = results[results.length-1].address_components[0].short_name;

          // console.log("cityName = " + cityName, "country = " + country, "countryCode = " + countryCode);
          // console.log(response);

          //resolve([cityName, country, countryCode]);

          positionData.cityName = cityName;
          positionData.country = country;
          positionData.countryCode = countryCode;
          positionData.latitude = latitude;
          positionData.longitude = longitude;
          resolve(positionData)
        });
      });
    });
  };


  // MAKES ECHONEST API CALL BASED ON cityName AND country
  function getArtists(positionData, familiarity, genre) {
    return new Promise(function(resolve, reject) {
      var familiarityTerm = familiarity || '0.1';
      var genreTerm = genre || '*';
      var cityName = positionData.cityName;
      var country = positionData.country;
      var echonestUrl = 'https://developer.echonest.com/api/v4/artist/search?api_key=BG6IJZJJYOKNETBX8' +
                    '&format=json' +
                    '&artist_location=' + cityName + '+' + country +
                    '&min_familiarity=' + familiarityTerm +
                    '&description=' + genreTerm +
                    '&sort=familiarity-desc&results=35' +
                    '&bucket=id:spotify' +
                    '&bucket=genre' +
                    '&bucket=biographies';

      console.log('echonestURL ', echonestUrl)
https://developer.echonest.com/api/v4/artist/search?api_key=BG6IJZJJYOKNETB…=classical&sort=familiarity-desc&results=35&bucket=id:spotify&bucket=genre
      $.get(echonestUrl, function(data){
        resolve(data);
      });
    });
  };

  // MAKES SPOTIFY API CALL BASED ON THE ARTIST ID AND SETS PROPERTY topTracks AND A randomTrack
  // THIS SHOULD BE REFRACTORED INTO TWO METHODS: 1) getTopTracksForAllArtists 2) addTracksToPlaylist
  // IF POSSIBLE playIfNotPlaying SHOULD BE CALLED FROM OUTSIDE OF THIS FUNCTION
  // function getArtistTopTracks(artist) {
  function getArtistTopTracks(artistsObject, positionData) {
    return new Promise(function(resolve, reject) {
    artistsObject.response.artists.forEach(function(artist) {
        var spotifyId = spotifyArtistId(artist);
        var countryCode = positionData.countryCode;
        var topTracksUrl = "https://api.spotify.com/v1/artists/" + spotifyId + "/top-tracks?country=" + countryCode;
        
        
        $.get(topTracksUrl, function(response){
          response.tracks.forEach(function(song) {
            //console.log("song (see below)");
            //console.log(song);

            myPlaylist.add({
              title: song.name,
              artist: song.artists[0].name,
              mp3: song.preview_url,
              poster: song.album.images[0].url,
              bio: artist.biographies[0].text
            });
          playIfNotPlaying();
          });
        });
      });
      resolve('No data to return');
    });
  }

  // PLAY THE PLAYLIST IF IT'S NOT ALREADY PLAYING
  function playIfNotPlaying(){
    if (!playing) {
      playing = true;
      myPlaylist.play(0);
    };
  }

  // PICKS OUT THE ARTIST ID FROM THE URI
  function spotifyArtistId(artist) {
    var foreignId = artist.foreign_ids[0].foreign_id
    return foreignId.slice(15);
  }


  // CONVERTS MULTI WORD STRINGS INTO PARAMS e.g. 'Brighton and Hove' => 'Brighton+and+Hove'
  function convToParam(words) {
    var result = words.split(" ");
    result = result.join("+");
    return result;
  }

  function getSongKickMetroID(positionData) {
    return new Promise(function(resolve, reject) {
      var eventUrl = 'https://api.songkick.com/api/3.0/search/locations.json?location=geo:'+
        positionData.latitude + ',' + positionData.longitude +
        '&apikey=qMMmyACVKOgL3Kgb' + '&jsoncallback=?';
      $.getJSON(eventUrl, function(data){
          var metroAreaID = data.resultsPage.results.location[0].metroArea.id;
          resolve(metroAreaID);
      });
    });
  };

  function getUpcomingEvents(metroAreaID) {
    var eventUrl = 'https://api.songkick.com/api/3.0/metro_areas/' +
    metroAreaID +
    '/calendar.json?apikey=qMMmyACVKOgL3Kgb' + '&jsoncallback=?';
    $.getJSON(eventUrl, function(data){
      console.log(data.resultsPage);
      $.each(data.resultsPage.results.event, function (i, event) {
        var uri = event.uri;
        var displayName = event.displayName;
        $("#event").append("<li><a href="+"\""+uri+"\""+
          "onClick=\"return popup(this, 'popup')\">"+displayName+"</a></li>");
        $("#localEventsList").append("<li><a href="+"\""+uri+"\""+
          "onClick=\"return popup(this, 'popup')\">"+displayName+"</a></li>");
      });
    });
  };

  // CALLING THE FUNCTIONS IN A CHAIN
  showPosition().then(function(positionPromise) {
    positionData = positionPromise;
    console.log('THE SECOND PROMISE: (see object below)');
    console.log(positionData);
    document.getElementById("currentLocation").innerHTML = positionData.cityName;
    getArtists(positionData).then(function(artistsObjectPromise) {
      console.log('THE THIRD PROMISE: (see object below)');
      console.log(artistsObjectPromise);
      getArtistTopTracks(artistsObjectPromise, positionData).then(function(topTracksPromise) {
        console.log('THE FOURTH PROMISE: ' + topTracksPromise);
      });
    });
    getSongKickMetroID(positionData).then(function(metroAreaIDPromise) {
      getUpcomingEvents(metroAreaIDPromise);
    });
  });
});