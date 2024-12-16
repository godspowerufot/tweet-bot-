import http from 'http';
import { connect } from '@ngrok/ngrok';
import dotenv from 'dotenv';
import OAuth from 'oauth';
import path from 'path';
import ngrok from '@ngrok/ngrok'
import { fileURLToPath } from 'url';
import fs from 'fs'; // Import fs for logging

dotenv.config(); 

const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
const accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
const authorizeUrl = 'https://api.twitter.com/oauth/authorize';

const APP_CONSUMER_KEY = process.env.APP_CONSUMER_KEY;
const APP_CONSUMER_SECRET = process.env.APP_CONSUMER_SECRET;
let appCallbackUrl = ''; // Declare appCallbackUrl as a global variable

const oauthStore = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function logToFile(message) {
  fs.appendFile('oauth_debug.log', `${new Date().toISOString()} - ${message}\n`, err => {
    if (err) console.error('Error writing to log file:', err);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url;

  if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Welcome to OAuth with Twitter</h1>
      <button id="startOAuth">Start OAuth</button>
      <script>
        document.getElementById('startOAuth').addEventListener('click', function() {
          fetch('/start')
            .then(response => response.text())
            .then(html => {
              document.body.innerHTML = html;
            });
        });
      </script>
    `);
  } else if (url.startsWith('/start')) {
    const oauth = new OAuth.OAuth(
      requestTokenUrl,
      accessTokenUrl,
      APP_CONSUMER_KEY,
      APP_CONSUMER_SECRET,
      '1.0',
      appCallbackUrl,
      'HMAC-SHA1'
    );

    oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret) => {
      if (error) {
        console.error('Error generating OAuth token:', error);
        logToFile(`Error generating OAuth token: ${error}`);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Error generating OAuth token</h1>');
        return;
      }

      logToFile(`Generated Request Token: oauthToken=${oauthToken}, oauthTokenSecret=${oauthTokenSecret}`);
      oauthStore[oauthToken] = oauthTokenSecret;
      const authUrl = `${authorizeUrl}?oauth_token=${oauthToken}`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Redirect to <a href="${authUrl}">Twitter Authorization</a></h1>
        <p>If you are not redirected, click the link above.</p>
      `);
    });
  } else if (url.startsWith('/tokens?oauth_token') && url.includes('oauth_verifier')) {
    const params = new URLSearchParams(req.url.split('?')[1]);
    logToFile(`Callback Query Parameters: ${JSON.stringify(Object.fromEntries(params))}`);

    const { oauth_token: oauthToken, oauth_verifier: oauthVerifier, denied: oauthDenied } = Object.fromEntries(params);

    if (oauthDenied) {
      delete oauthStore[oauthDenied];
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>OAuth request was denied by the user.</h1>');
      return;
    }

    if (!oauthToken || !oauthVerifier) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Missing OAuth parameters in the callback.</h1>');
      return;
    }

    const oauthTokenSecret = oauthStore[oauthToken];
    logToFile(`Retrieved OAuth Token Secret: ${oauthTokenSecret}`);

    if (!oauthTokenSecret) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>OAuth token not found locally.</h1>');
      return;
    }

    const oauth = new OAuth.OAuth(
      requestTokenUrl,
      accessTokenUrl,
      APP_CONSUMER_KEY,
      APP_CONSUMER_SECRET,
      '1.0',
      null,
      'HMAC-SHA1'
    );

    oauth.getOAuthAccessToken(oauthToken, oauthTokenSecret, oauthVerifier, (error, accessToken, accessTokenSecret) => {
      if (error) {
        console.error('Error obtaining access tokens:', error);
        logToFile(`Error obtaining access tokens: ${error}`);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>Failed to obtain access tokens.</h1>');
        return;
      }

      logToFile(`Access Token: ${accessToken}, Access Token Secret: ${accessTokenSecret}`);
      console.log('Access Token:', accessToken);
      console.log('Access Token Secret:', accessTokenSecret);

      oauthStore[accessToken] = {
        token: accessToken,
        tokenSecret: accessTokenSecret,
      };

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Your OAuth Tokens</h1>
        <p><strong>Access Token:</strong> ${accessToken}</p>
        <p><strong>Access Token Secret:</strong> ${accessTokenSecret}</p>
        <p>You can use these tokens to post to another Twitter account!</p>
      `);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>Page not found</h1>');
  }
});

server.listen(8080, () => {
  console.log('Node.js web server at 8080 is running...');
  ngrok
    .connect({ addr: 8080, authtoken_from_env: true })
    .then(listener => {
      appCallbackUrl = `${listener.url()}/tokens`; // Set the global appCallbackUrl after ngrok connection
      logToFile(`Ngrok established at: ${listener.url()}`);
      console.log(`Ingress established at: ${listener.url()}`);
    })
    .catch(err => {
      console.error('Error establishing ngrok tunnel:', err);
      logToFile(`Error establishing ngrok tunnel: ${err}`);
    });
});
