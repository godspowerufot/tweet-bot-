// Import required modules
import OpenAI from "openai";
import { TwitterApi } from "twitter-api-v2";
import dotenv from 'dotenv';
dotenv.config()
// OpenAI API Setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Twitter API Setup
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Function to generate a tweet using ChatGPT
async function generateTweet() {
    try {
      // Hardcoded tweet for testing
      const tweet = "🤖 Automated Tweet: THIS WAS TWEETED FROM MY BOT IN DEV";
      return tweet;
    } catch (error) {
      console.error("Error generating tweet:", error);
      return null;
    }
  }
  
// Function to post the tweet
async function postTweet() {
  try {
    const tweetContent = await generateTweet();
    if (tweetContent) {
      await twitterClient.v2.tweet(tweetContent);
      console.log("Tweet posted successfully:", tweetContent);
    } else {
      console.log("Failed to generate tweet content.");
    }
  } catch (error) {
    console.error("Error posting tweet:", error);
  }
}

// Run the bot
postTweet();

async  function Credentials() {
    try {
      const { data } = await twitterClient.v2.me();
      console.log("Authenticated as:", data.username);
    } catch (error) {
      console.error("Authentication failed:", error);
    }
  };
  
  Credentials()
  console.log(process.env.TWITTER_API_KEY);
console.log(process.env.TWITTER_API_SECRET);
console.log(process.env.TWITTER_ACCESS_TOKEN);
console.log(process.env.TWITTER_ACCESS_SECRET);