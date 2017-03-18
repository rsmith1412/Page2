/*=============================================================================================
Working skyscanner car response + places.
===============================================================================================*/

//The MODEL - aggregates data from user input and consolidates them into parameter objects.
/*=============================================================================================*/
var carQueryParams = {
  "market": "US",
  "currency": "USD",
  "locale": "en-US",
  "pickupplace": null,
  "dropoffplace": null,
  "pickupdatetime": null,
  "dropoffdatetime": null,
  "driverage": null
}
var placesQueryParams = {
  //pull lat and lon data from skyscanner api.
  "location": null, 
  "city": null,
  //default to 50,000 meters
  "radius": 50000, 
}
/*=============================================================================================*/
//Controller and View. Note, mispelled 'alpaca' on purpose to not interferre with other's code.
var aplaca = {
  //collection of raw data from airports
  "preloadedData": [],
  //collection of US cities only.
  "cityName": [],
  //collection of lat and lon data.
  "carImageId": [],
  "carImageUrl": [],
  "carResultCounter": 1,
  "maxCarResults": 5,
  "placesResultCounter": 1,
  "maxPlacesResults": 5,
  /*api keys and ip are stored on firebase for security reasons.
  ===============================================================================*/
  "apiKeyPlaces": null,
  "apiKeyCar": null,
  "ip": null,
  //=============================================================================
  "queryURLBasePlaces": "https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurants+in+",
  "queryURLBaseCar": "http://partners.api.skyscanner.net/apiservices/carhire/liveprices/v2/",
  "newUrlPlaces": null,
  "newUrlCar": null,
  //user input checking===========================================================
  "placesFlag": true,               
  "carFlag": true,
  "carFlagCounter": 0,            
  //==============================================================================

    //main controller 
    init: function () {
      this.fireBase();
      this.loadData();
      this.cacheDom();
      this.bindEvents();
      this.render();
      
    },
    fireBase: function () {
      // ========================================================================= 
      // Initialize Firebase
      var config = {
      apiKey: "AIzaSyDxrfECQIUwg8qfKJe1WaDTSgNN8o18lqY",
      authDomain: "alpacamybags-bee2f.firebaseapp.com",
      databaseURL: "https://alpacamybags-bee2f.firebaseio.com",
      storageBucket: "alpacamybags-bee2f.appspot.com",
      messagingSenderId: "183216533923"
      };
      firebase.initializeApp(config);
      //reference for database.
      var dataRef = firebase.database();
      //listener for search button
      $("#submit").on("click", function(event) {
        event.preventDefault();
        
        name = $("#address").val().trim();
        console.log(name);
        // pushing the searched places into the DB -> 'recentHistory' node.
        dataRef.ref("/recentHistory").push({
          recentPlacesSearch: name,
        });
      });
      //acquiring api keys and ip from the firebase DB, used orderByChild to access dateAdded node.
      dataRef.ref()
             .orderByChild("dateAdded")
             .limitToLast(1)
             .on("child_added", function(childSnapshot) {
      // Log api keys and ip address from snapshot from dateAdded.
      // should only be one node with the dateAdded.
      aplaca.apiKeyPlaces = childSnapshot.val().apiKeyPlaces;
      aplaca.apiKeyCar = childSnapshot.val().apiKeyCar;
      aplaca.ip = childSnapshot.val().ip;

      }, function(errorObject) {
        console.log("Errors handled: " + errorObject.code);
      });
      //accessing recent History and updating the DOM.
      dataRef.ref("/recentHistory").on("child_added", function(snapshot) {
        // Change the HTML to reflect
        var newUl = $("<ul>");
       newUl.append("<li>" + snapshot.val().recentPlacesSearch + "</li>");
       $("#recentHistory").append(newUl);
      });
    },
    //first ajax call to load autocomplete and user input control.
    loadData: function () {
      //maintaining context to main obj
      var self = this;
      $.ajax({
          method: "POST",
          dataType: "json",
          url: "https://proxy-cbc.herokuapp.com/proxy",
          data: {
            url: "http://partners.api.skyscanner.net/apiservices/geo/v1.0?apikey=uc462626261286303668321436417455" 
          }
      }).done(function(response){
        console.log(response);
        //pushing entire airport data obj into preloaded array parameter
        for (var i = 0; i < response.data.Continents[6].Countries[5].Cities.length; i++) {
          self.preloadedData.push(response.data.Continents[6].Countries[5].Cities[i].Airports[0])
        }
        console.log(aplaca.preloadedData[0]);
        //preloading city names into array for use with autocomplete from jquery UI lib.
        for(var i = 0; i < self.preloadedData.length; i++) {
          //pushing all US cities onto cityName parameter
          self.cityName.push(self.preloadedData[i].Name);
        }
      });
    },
    //caching the DOM so we are not searching through the DOM over and over again.
    cacheDom: function () {
      //preloading all DOM selectors
      this.$searchBtn = $("#btn-call");
      this.$searchPlacesBtn = $("#submit");
      this.$depart = $("#depart");
      this.$return = $("#return");
      this.$from = $("#from");
      this.$to = $("#to");
      this.$hrUp = $("#hrUp");
      this.$minUp = $("#minUp");
      this.$hrOff = $("#hrOff");
      this.$minOff = $("#minOff");
      this.$carResults = $("#carResults");
      this.$placesResults = $("#restaurantsResults");
    },
    //binding events for car and places search button.
    bindEvents: function () {
      this.$searchBtn.on("click", this.runCarQuery.bind(this));
      this.$searchPlacesBtn.on("click", this.runPlacesQuery.bind(this));
    },
    //initial jquery UI interfaces and autocomplete features.
    render: function () {
      //Hide the errors panel, until user improperly enters form.
      $("#errorPanel").hide();
      //Hide restaurants DIV until search
      $("#panel-restaurants").hide();
      //only review this DIV if user input is not valid.
      $("#errors").hide();
      //jquery UI library for autocomplete and also calendar date picker.
      $( function() {
        aplaca.$depart.datepicker();
        aplaca.$return.datepicker();
        $( "#where" ).autocomplete({
        source: aplaca.cityName
        });
        aplaca.$from.autocomplete({
        source: aplaca.cityName
        });
        aplaca.$to.autocomplete({
        source: aplaca.cityName
        });
      }); 
    },
    //conditions the query for the skyscanner live car prices parameters.
    queryConditioning: function () {
      //slicing month, day, and year to match skyscanner's date format.
      //date format YYYY-MM-DDT00:00
      carQueryParams.pickupdatetime = this.$depart.val().slice(6) + "-" + 
                                      this.$depart.val().slice(0,2) + "-" + 
                                      this.$depart.val().slice(3,5) + "T" + 
                                      this.$hrUp.val() + ":" + 
                                      this.$minUp.val();
      carQueryParams.dropoffdatetime = this.$return.val().slice(6) + "-" + 
                                      this.$return.val().slice(0,2) + "-" + 
                                      this.$return.val().slice(3,5) + "T" + 
                                      this.$hrOff.val() + ":" + 
                                      this.$minOff.val();
      carQueryParams.driverage = $("#age").val();
      console.log(carQueryParams);
    },
    renderCarResults: function (carData) {
      //loop to aggregate 10 IDs into our object parameter carImageID
      for(var i = 0; i < aplaca.maxCarResults; i++) {
        aplaca.carImageId.push(carData.data.cars[i].image_id);
      }
      //outter loop cycles through our 10 image IDs
      for(var i = 0; i < aplaca.carImageId.length; i++) {
          //inner loop compared each ID with the image ID returned by the skyscanner response.
          for(var j = 0; j < carData.data.images.length; j++) {
            //matched! acquire the matched url for the car image.
            if(aplaca.carImageId[i] === carData.data.images[j].id) {
              aplaca.carImageUrl.push(carData.data.images[j].url);
            }
          } 
      }
      //appending params into the DOM, 10 total vehicles, pics, and prices.
      for(var i = 0; i < 5; i++) {
        var newH1 = $("<h1>" + aplaca.carResultCounter + "</h1>");
        this.$carResults.append(newH1);
        this.$carResults.append("<p>" + 
          carData.data.cars[i].vehicle + "</p>");
        this.$carResults.append("<p> $ " + 
          carData.data.cars[i].price_all_days + "</p>");
        this.$carResults.append("<img src='" + aplaca.carImageUrl[i] + "'> <br>");
        this.$carResults.append("<a href=" + carData.data.cars[i].deeplink_url +
          "class='btn btn-default' target='_blank'> Book It!!! </a>" );
        aplaca.carResultCounter++;
      }
      // <a href="http://google.com" class="btn btn-default">Go to Google</a>
    },
    renderPlacesResults: function (placesData) {
      //appending params into DOM for restuarants.
      for(var i = 0; i < aplaca.maxPlacesResults; i++) {
        var newH1 = $("<h1>" + aplaca.placesResultCounter + "</h1>");
        this.$placesResults.append(newH1);
        this.$placesResults.append("<p>Restaurant Name: '" +
          placesData.data.results[i].name + "'</p>" +
          "<p>Address: " + placesData.data.results[i].formatted_address + "</p>" +
          "<p>Rating: " + placesData.data.results[i].rating + "</p>"

          );
        aplaca.placesResultCounter++;
      }
    },
    //method to run the ajax call for Car Rentals
    runCarQuery: function () {
      //maintain context to aplaca.
      var self = this; 
      //before proceeding to run the ajax response, perform error checking on user input.
      this.errorChecking();
      var pickUp = this.$from.val();
      var dropOff = this.$to.val();
      //for loop used to collect corresponding IDs for each city name.
      for(var i = 0; i < this.preloadedData.length; i++) {
        //if preloaded name is equal user input, acquire ID and put into carQueryParams (pickup) obj
        if(this.preloadedData[i].Name === pickUp) {
          carQueryParams.pickupplace = this.preloadedData[i].Id;
        }
        //if preloaded name is equal to user input for dropOff, acquire ID and put into carQueryParams (dropOff) obj
        if(this.preloadedData[i].Name === dropOff) {
          carQueryParams.dropoffplace = this.preloadedData[i].Id;
        } 
      }
      console.log(carQueryParams);
      this.queryConditioning();
      //constructing the newUrl parameters to be fed to skyscanner.
      this.newUrlCar = this.queryURLBaseCar + 
                    carQueryParams.market + "/" +
                    carQueryParams.currency + "/" +
                    carQueryParams.locale + "/" +
                    carQueryParams.pickupplace + "/" +
                    carQueryParams.dropoffplace + "/" +
                    carQueryParams.pickupdatetime + "/" +
                    carQueryParams.dropoffdatetime + "/" +
                    carQueryParams.driverage + "?apiKey=" + this.apiKeyCar +
                    "&userip=" + this.ip;
      console.log(this.newUrlCar);
      // if(this.carFlag === true){
      $.ajax({
          method: "POST",
          dataType: "json",
          url: "https://proxy-cbc.herokuapp.com/proxy",
          data: {
            url: self.newUrlCar  
          }
      }).done(function(response){
        console.log("======================");
        console.log(response);
        //even listener fired, now check for any errors
        if(response.data.errors) {
          //first empty out previous errors
          $("#errorlist").empty();
          $("#errorPanel").show();
          for(var i = 0; i < response.data.errors.length; i++){
            var newUL = $("<ul style='color:red;'>");
            newUL.append("<li>" + response.data.errors[i] + "</li>");
            $("#errorlist").append(newUL);
          }
        }
        else {
        //successfull callback, call the renderCarResults method.
        $("#errorPanel").hide();
        self.renderCarResults(response);
        }
      });
      //}
      return false;
    },
    //method to run the ajax call for Restaurant recommendations.
    runPlacesQuery: function () {
      //maintain context to aplaca.
      $("#panel-restaurants").show();
      var self = this; 
      var place = $("#where").val();
      //for loop used to collect corresponding lat and lon of searched destination.
      for(var i = 0; i < this.preloadedData.length; i++) {
        if(this.preloadedData[i].Name === place) {
          placesQueryParams.location = this.preloadedData[i].Location;
          placesQueryParams.city = place;
        }
      }
      console.log(placesQueryParams);
      //constructing the newUrl parameters to be fed to skyscanner.
      this.newUrlPlaces = this.queryURLBasePlaces + 
                    placesQueryParams.city +
                    "&key=" + this.apiKeyPlaces 
      console.log(this.newUrlPlaces);
      $.ajax({
          method: "POST",
          dataType: "json",
          url: "https://proxy-cbc.herokuapp.com/proxy",
          data: {
            url: self.newUrlPlaces  
          }
      }).done(function(response){
        console.log("==========");
        console.log(response);
        //successfull callback, call the renderCarResults method.
        self.renderPlacesResults(response);
      });
      return false;
    },//end of runPlacesQuery method.
    errorChecking: function() {
      
      // for(var i = 0; i < aplaca.cityName.length; i++) {
      //   if(this.$from.val().trim() === aplaca.cityName[i]){
      //     aplaca.carFlagCounter++;
      //     i = aplaca.cityName.length;
      //   }
      //   if(aplaca.carFlagCounter === 1) {
      //     return;
      //   }
      //   else{
      //     $("#errors").show();
      //     $("#errors").append("<p>*" + this.$to.val().trim() + " is not a valid pick up place.</p>");
      //     aplaca.carFlag = false;
      //   }
      // }
      // for(var i = 0; i < aplaca.cityName.length; i++) {
      //   if(this.$to.val().trim() !== aplaca.cityName[i]){
      //     $("#errors").show();
      //     $("#errors").append("<p>*" + this.$to.val().trim() + " is not a valid drop off place.</p>");
      //     i = aplaca.cityName.length; //exiting loop.
      //     aplaca.placeFlag = false;
      //   }
      //   else 
      //     aplaca.placeFlag = true;
      // }
    }
}//end of aplaca obj

//when document is ready, start the initialization of the object.
$(document).ready(function () {
    //initializing controller & view
    aplaca.init();
});

/*=====================================================================================*/