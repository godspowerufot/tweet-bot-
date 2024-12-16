
import { TwitterApi } from 'twitter-api-v2';
import OpenAIApi from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config(); // Load environment variables

// Validate environment variables
if (!process.env.APP_CONSUMER_KEY|| !process.env.APP_CONSUMER_SECRET|| 
    !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET || 
    !process.env.OPENAI_API_KEY) {
  console.error('❌ Missing environment variables. Exiting...');
  process.exit(1);
}


// Initialize Twitter API client
const twitterClient = new TwitterApi({
  appKey: process.env.APP_CONSUMER_KEY,
  appSecret: process.env.APP_CONSUMER_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Initialize OpenAI API client for GPT-4 and DALL-E
const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate an image using DALL·E
async function generateImage(prompt) {
  try {
    console.log('🖌️ Generating image...');
    const response = await openai.images.generate({
      prompt: prompt,
      n: 1,
      size: '1024x1024',
    });

    const imageUrl = response.data[0].url; // Get the image URL
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();

    const imagePath = path.resolve('./generated-image.png');
    fs.writeFileSync(imagePath, Buffer.from(buffer));
    console.log('📁 Image saved locally:', imagePath);

    return imagePath;
  } catch (error) {
    console.error('❌ Error generating image:', error);
    return null;
  }
}

// Function to upload an image to Twitter
async function uploadImageToTwitter(imagePath) {
  try {
    console.log('🚀 Uploading image to Twitter...');
    const mediaId = await twitterClient.v1.uploadMedia(imagePath);
    console.log('✅ Image uploaded to Twitter. Media ID:', mediaId);
    return mediaId;
  } catch (error) {
    console.error('❌ Error uploading image to Twitter:', error);
    return null;
  }
}

// Function to generate tweet text using GPT-4
async function generateTweetText(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // Specify GPT-4 model
      messages: [{
        role: 'user',
        content: `Write a concise tweet about the following futuristic  THE HASHTAGS SHOULH ONLY BE TWO topic randomly  and short history about top crypto influencers and top people that influence the market bitcoin founder, etcadd #solana #solanaAiAgent  : ${prompt}`,
      }],
      max_tokens: 100,
      temperature: 0.7,
    });
    // Extract the generated tweet text from the response
    const tweetText = response.choices[0].message.content.trim();
    console.log('📝 Generated Tweet:', tweetText);
    return tweetText;
  } catch (error) {
    console.error('❌ Error generating tweet:', error);
    return 'Something went wrong with generating the tweet.';
  }
}


// Function to post a tweet with text and image
async function postTweetWithImage(text, mediaId) {
  try {
    console.log('📢 Posting tweet...');
    await twitterClient.v2.tweet({
      text: text,
      media: { media_ids: [mediaId] },
    });
    console.log('✅ Tweet posted successfully!');
  } catch (error) {
    console.error('❌ Error posting tweet:', error);
  }
}

// Main function to automate the process
async function main() {
  console.log('💡 Starting the bot...');
  const prompt = " high quality HD Cosmos, crypto, blockchain, AI, and futuristic technology,Quantum art , Ancient Egyptians , love randmly  AI, humanoid, solana , solana agent  ";

  // Step 1: Generate the image
  const imagePath = await generateImage(prompt);
  if (!imagePath) {
    console.error('⚠️ Image generation failed. Exiting.');
    return;
  }

  // Step 2: Generate the tweet text using GPT-4
  const tweetText = await generateTweetText(prompt);

  // Step 3: Upload the image to Twitter
  const mediaId = await uploadImageToTwitter(imagePath);
  if (!mediaId) {
    console.error('⚠️ Image upload failed. Exiting.');
    return;
  }

  // Step 4: Post the tweet with the image
  await postTweetWithImage(tweetText, mediaId);

  console.log('🚀 Bot completed successfully!');
}

// Run the main function every 3 minutes
setInterval(main,9* 60 * 1000); // 3 minutes in milliseconds

// First run to test bot immediately
main();
