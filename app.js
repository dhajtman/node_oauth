const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = 3000;

// Replace with your Google OAuth credentials
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const access_token = "";
const id_token = "";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Step 1: Redirect to Google's OAuth 2.0 server
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile'],
  });
  res.redirect(authUrl);
});

// Step 2: Handle the OAuth 2.0 server response
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user info
    const userInfoResponse = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    res.send(userInfoResponse.data);
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

// Middleware to check if the user is authenticated
const authenticateIDToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('Authorization header missing');
  }

  const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

  try {
    // Verify the token using the OAuth2Client
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID, // Ensure the token is for this app
    });

    req.user = ticket.getPayload(); // Attach user info to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).send('Invalid or expired token');
  }
};

const authenticateAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('Authorization header missing');
  }

  const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

  try {
    // Validate the access token using Google's tokeninfo endpoint
    const response = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);

    // Attach user info to the request
    req.user = {
      id: response.data.user_id,
      email: response.data.email,
      name: response.data.name,
    };

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Token validation failed:', error.response?.data || error.message);
    res.status(401).send('Invalid or expired token');
  }
};

// Protected API endpoint
app.get('/api/data', authenticateIDToken, (req, res) => {
  const data = {
    message: `Hello, ${req.user.name}! This is your authorized API response!`,
    timestamp: new Date().toISOString(),
  };

  res.json(data);
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});