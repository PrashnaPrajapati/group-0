const vader = require("vader-sentiment");

function analyzeSentiment(text) {
  const sentiment = vader.SentimentIntensityAnalyzer.polarity_scores(text);
  
  // Sentiment values: 
  // sentiment['compound'] -> Overall sentiment score
  // sentiment['pos'], sentiment['neu'], sentiment['neg'] -> Positive, Neutral, Negative scores

  if (sentiment.compound >= 0.05) {
    return { sentiment: "Positive", score: sentiment.compound };
  } else if (sentiment.compound <= -0.05) {
    return { sentiment: "Negative", score: sentiment.compound };
  } else {
    return { sentiment: "Neutral", score: sentiment.compound };
  }
}

module.exports = analyzeSentiment;