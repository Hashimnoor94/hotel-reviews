// Modules to import

const express = require("express");
const rp = require("request-promise");
const cfenv = require("cfenv");
const app = express();
const server = require("http").createServer(app);
const io = require('socket.io')(server);
const appEnv = cfenv.getAppEnv();
app.use(express.static(__dirname + '/public'));
const { IamAuthenticator } = require('ibm-watson/auth');

// Create the Conversation object

const AssistantV1 = require('ibm-watson/assistant/v1');
const assistant = new AssistantV1({
  version: '2020-04-01',
  authenticator: new IamAuthenticator({
    apikey: '', //add watson assistant api key between ' ' 
  }),
  url: '', //add watson assistant url between ' ' 
});

var workspace = ''; //add workspace id between ''
var context = {};

// Create the Discovery object

const DiscoveryV1 = require('ibm-watson/discovery/v1');
const discovery = new DiscoveryV1({
  version: '2019-10-10',
  authenticator: new IamAuthenticator({
    apikey: '', //add discovery api key between ' ' 
  }),
  url: '', //add dicovery url between ' ' 
});

var environment_Id = ''; //add environment_Id between ''
var collection_Id = ''; //add collection_Id between ''

// Create the Tone Analyzer object

const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3');
const toneAnalyzer = new ToneAnalyzerV3({
  version: '2017-09-21',
  authenticator: new IamAuthenticator({
    apikey: '', //add the tone analyzer apikey between ''
  }),
  url: '', //add the tone analyzer apiurl between ''
});

// Create Personlity Insights object

const PersonalityInsightsV3 = require('ibm-watson/personality-insights/v3');
const personalityInsights = new PersonalityInsightsV3({
  version: '2017-10-13',
  authenticator: new IamAuthenticator({
    apikey: '', //add the personality insights apikey between ''
  }),
  url: '', //add the personality insights api url between ''
});


// start server on the specified port and binding host
server.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

io.on('connection', function(socket) {
  console.log('a user has connected');

  // Handle incomming chat message
  socket.on('chat message', function(msg) {

    console.log('message: ' + msg);
    io.emit('chat message', "you: " + msg);
    
    /*****************************
        Send text to Conversation
    ******************************/
    
      assistant.message({
      context: context,
      input: { text: msg },
      workspaceId: workspace
     }, function(err, response) {
         if (err) 
         {
           console.error(err);
         } 
         else 
         {
              var reply = JSON.stringify(response.result.output.text[0], null, 2);
                context = response.result.context;
                var queryString = "";
                var answer = [];
                var city = "";
                if (context.best) 
                {
                    switch(context.best) 
                    {
                        case "All":
                         
                            queryString="term(hotel,count:50).average(enriched_text.sentiment.document.score)";
                            queryDiscovery(queryString, function(err, queryResults) {

                            if (err) {
                                console.log(err);
                            }

                            queryResults = queryResults.result.aggregations[0].results;

                            findBestHotel(queryResults, function(hotel, sentiment) {

                                io.emit('chat message', "The best hotel overall is " + hotel.replace(/_/g," ") +  " with an average sentiment of "+sentiment.toFixed(2));
                            });

                            });
                        break;
                        case "new-york-city":
                            queryString="filter(city::"+context.best+").term(hotel,count:50).average(enriched_text.sentiment.document.score)";
                            queryDiscovery(queryString, function(err, queryResults) {
        
                            if (err) {
                                console.log(err);
                            }
        
                            queryResults = queryResults.result.aggregations[0].aggregations[0].results;
        
                            findBestHotel(queryResults, function(hotel, sentiment) {
        
                                io.emit('chat message', "The best hotel in New York City is " + hotel.replace(/_/g," ") + " with an average sentiment of "+sentiment.toFixed(2));
                            });
        
                            });
      
                        break;
                        case "san-francisco":
                        queryString="filter(city::"+context.best+").term(hotel,count:50).average(enriched_text.sentiment.document.score)";
                        queryDiscovery(queryString, function(err, queryResults) {
       
                          if (err) {
                            console.log(err);
                          }
       
                          queryResults = queryResults.result.aggregations[0].aggregations[0].results;
       
                          findBestHotel(queryResults, function(hotel, sentiment) {
       
                            io.emit('chat message', "The best hotel in San Francisco is " + hotel.replace(/_/g," ") + " with an average sentiment of "+sentiment.toFixed(2));
                          });
                        });
                         
                        break;
                        case "chicago":
                            queryString="filter(city::"+context.best+").term(hotel,count:50).average(enriched_text.sentiment.document.score)";
                            queryDiscovery(queryString, function(err, queryResults) {
        
                            if (err) {
                            console.log(err);
                            }
                            //queryResults = queryResults.aggregations[0].aggregations[0].results;
                            queryResults = queryResults.result.aggregations[0].aggregations[0].results;
        
                            findBestHotel(queryResults, function(hotel, sentiment) {
        
                            io.emit('chat message', "The best hotel in Chicago is " + hotel.replace(/_/g," ")  + " with an average sentiment of "+sentiment.toFixed(2));
                            });
                        });
          
                        break;
                      }
 
                } 
                else if (context.list) 
                {
                  city = context.list;
                  queryString = "term(city,count:10).term(hotel,count:25)"
                  queryDiscovery(queryString, function(err, queryResults) {
                    if (err) {
                      console.log(err);
                    }
                    
                    queryResults = queryResults.result.aggregations[0].results;
            
                    for(var i=0; i<queryResults.length; i++) {
      
                      if(queryResults[i].key == city) {
                        
                        console.log(queryResults);

                        for(var x=0; x<queryResults[i].aggregations[0].results.length; x++) {
      
                          if (x == queryResults[i].aggregations[0].results.length - 1) {
                            answer[x] = "and " + queryResults[i].aggregations[0].results[x].key;
                            console.log(answer);
                          } else {
                            
                            answer[x] = queryResults[i].aggregations[0].results[x].key.replace(/_/g," ");
                            console.log(answer);
                          }
                        }
                      }
                    }
                   io.emit('chat message', "Hotel Bot: " + reply.replace(/"/g,""));
                   for( var n=0; n<answer.length;n++) {
                     console.log(answer[n]);
                     io.emit('chat message',"--- " + answer[n]);
                   }
                  }); 
                } 
                else if (context.hotel) 
                {
                  var chosenHotel = context.hotel[0].value;

                  console.log("More Info on hotel: ");
                  console.log(chosenHotel);
    
                  queryString = "nested(enriched_text.sentiment.document.label).filter(hotel::" + chosenHotel + ").term(enriched_text.sentiment.document.label,count:10)"
                  queryDiscovery(queryString, function(err, queryResults) {
                    if (err) {
                      console.log(err);
                    }
                    if (queryResults.result.aggregations[0].aggregations[0].results[0]) {
                      var positiveRevs = queryResults.result.aggregations[0].aggregations[0].results[0].matching_results;
                    } else { var positiveRevs = 0;}
    
                    if (queryResults.result.aggregations[0].aggregations[0].results[1]) {
                      var negativeRevs = queryResults.result.aggregations[0].aggregations[0].results[1].matching_results;
                    } else { var negativeRevs = 0;}
   
                    getReviewText(chosenHotel, function(err, reviewtext) {     
                      if (err) 
                      {
                        console.log(err);
                      }  

                      const toneParams = {toneInput: {'text': reviewtext}};             
                      toneAnalyzer.tone(toneParams, 
                      function(err, tone)
                      {
                          if (err)
                            console.log(err);    
                          var tones = tone.result.document_tone.tones;
                          var highestTone = {
                              name: "",
                              score: 0
                          };
                      var detectedTones = [];
                      
                      for(y=0;y<tones.length;y++) {
                        if (tones[y].score > highestTone.score) {
                          highestTone.score = tones[y].score;
                          highestTone.name = tones[y].tone_name;
                        }
                      
                        if (tones[y].score >= 0.40) {
                          detectedTones.push(tones[y].tone_name);
                        }
                      }
                      chosenHotel = chosenHotel.replace(/"/g,"").replace(/_/g," ");
                      io.emit('chat message', "Hotel Bot: "+reply.replace(/"/g,"")+" "+chosenHotel+" tells us:");
                      io.emit('chat message', "--- Out of "+ (positiveRevs+negativeRevs)+" total reviews, there are "+positiveRevs+" positive reviews and "+negativeRevs+" negative reviews.");    
                      io.emit('chat message', "--- The detected tones include "+ detectedTones +" with  "+highestTone.name+" being the most apparent emotional tone with a confidence of "+(highestTone.score*100).toFixed(0)+"%");   

                      const profileParams = {
                        content: reviewtext,
                        contentType: 'text/plain',
                        consumptionPreferences: true,
                        rawScores: true,
                      };


                      personalityInsights.profile(profileParams, 
                      function(err, response) 
                      {
                        if (err) 
                        {
                          console.log(err);
                        } 
                        else 
                        {
                        getPersonalityTraits(response, function(personality, preference) {

                          io.emit('chat message', "--- Personality traits include: ");
                        
                          for(i=0;i<personality.length;i++) {
                            io.emit('chat message', "--- --- "+personality[i].trait+" has a score of "+personality[i].score.toFixed(2)+" and shows traits of "+personality[i].child.name+".");
                          };
                        
                          io.emit('chat message', "--- Identified consumption preference: ");
                          io.emit('chat message', "--- --- "+preference);
                        
                        
                                });
                              }               
                      });       
                  });
              });
          });
        }
          else 
          {
              io.emit('chat message', "Hotel Bot: " + reply);
              if (context.system.branch_exited) {
                console.log("Exited");
                context = {};
              }  
          }
       }
      });
    });
  });


app.get('/', function(req, res){
  res.sendFile('index.html');
});

function queryDiscovery(query, callback) {
  // Function to query Discovery
 
  discovery.query({
    environmentId: environment_Id,
    collectionId: collection_Id,
    aggregation: query
    }, function(err, response) {
       if (err) {
         console.error(err);
         callback(err, null);
       } else {
         //var results = JSON.stringify(response, null, 2);
        // console.log(results);
         callback(null, response);
       }
    });
}

function findBestHotel(qResults, callback) {
  // Function to find the best hotel
  var highestSent = 0;
  var currentSent;
  var bestHotel;
  for (i=0;i<qResults.length;i++) {
    currentSent = qResults[i].aggregations[0].value;
    if (currentSent > highestSent) {
      highestSent=currentSent;
      bestHotel=qResults[i].key;
    }
  }
  callback(bestHotel, highestSent);
}

function getReviewText(hotel, callback) {
 
  discovery.query({
    environmentId: environment_Id,
    collectionId: collection_Id,
    filter: "hotel:"+hotel,
    return: "text"
    }, function(err, response) {
       if (err) {
         console.error(err);
         callback(err, null);
       } else {
 
         var combinedText = "";

         for (var x=0;x < response.result.results.length;x++)  {
           combinedText += response.result.results[x].text;
           combinedText += " ";
         }
         callback(null, combinedText);
       }
    });
}

function getPersonalityTraits(response, callback) {
  // Function that parses response from personality insights 
  var big5 = [];
  var traitScore;

  console.log(response);

  for (i=0;i<response.result.personality.length;i++){
    var highestChildScore = 0;
    var traitScore = response.result.personality[i].percentile;

    for (x=0;x <response.result.personality[i].children.length;x++){
      var currentChildScore = response.result.personality[i].children[x].percentile;
      if (currentChildScore > highestChildScore) {
        highestChildScore = currentChildScore;
        big5[i] = {
          trait: response.result.personality[i].name,
          score: traitScore,
          child: response.result.personality[i].children[x]
        }
      }
    }
  }
  for(i=0;i < big5.length;i++) {
    console.log(big5[i].trait);
    console.log(big5[i].score);
    console.log(big5[i].child.name);
  }
  console.log(big5);
  var consumptionPrefs = [];

  for (i=0; i<response.result.consumption_preferences[0].consumption_preferences.length;i++) {
    if(response.result.consumption_preferences[0].consumption_preferences[i].score == 1) {
      consumptionPrefs.push(response.result.consumption_preferences[0].consumption_preferences[i].name);
    }
  }
  for(i=0;i<consumptionPrefs.length;i++) {
    console.log(consumptionPrefs[i]);
  }
  var preference = consumptionPrefs[Math.floor(Math.random() * consumptionPrefs.length)];
  callback(big5, preference);
} 

