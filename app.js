const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = 3000;

// Replace with your Google OAuth credentials
// const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const access_token = "ya29.a0AeXRPp6PtX8Zv3h0yqWCQAhFCDzJ3aCy2rNu26eZ_TaT6czeoq-k9SFYjMZnQDsF_GherD-dCqriY0IpCUZCOgvG1iQB9Nl8lbCQXwt3ys8jawVT94lN0TjClqoI3jQEdhriyVLplryPKdkJQFj0KhNh1Nm1MRe5SGXAJ5d39gaCgYKASMSARISFQHGX2MiA9mbXEE3Skx6ULmu3CNMeA0177";
const id_token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVlMTkzZDQ2NDdhYjRhMzU4NWFhOWIyYjNiNDg0YTg3YWE2OGJiNDIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0NDA4ODczNzgwOTEtb2c5dmxudW81dGJocTU3MG1vdjdvOWF2bjcwMGxmbzUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0NDA4ODczNzgwOTEtb2c5dmxudW81dGJocTU3MG1vdjdvOWF2bjcwMGxmbzUuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTA3NjAwNjAwODE5MTY0NTg5MDciLCJhdF9oYXNoIjoiMW5TV2lpYjJCeFdLTHFfLURpczV4USIsIm5hbWUiOiJEdXNhbiBIYWp0bWFuc2t5IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0lzdXZxNEw5T0QwM1ZwVHJxbnctSHlfX2h1QXFRRFNiVEEwSXMtYW1yd0hvU0dOT2M9czk2LWMiLCJnaXZlbl9uYW1lIjoiRHVzYW4iLCJmYW1pbHlfbmFtZSI6IkhhanRtYW5za3kiLCJpYXQiOjE3NDI0NTczNjgsImV4cCI6MTc0MjQ2MDk2OH0.ID2j2JvxHe1JD7C76TGUjTNA-JEg6qpFiuo81EMpUQ0Enu3HTPgo3FjmEOQ3VZJ0oDFydAvnDLiq42IvvW4Vu9yGlsk39NmSpKKhGiGDYf9tydmyl15hdo-MYnuOvUpzRBZrdhy6twCQTiWLtNe40OcR3U4PEuvtj64C3kD6_mXljFpVNRoBZEHZyew4NHYNF-mVYxaiFbzxAN1ZHdPfjusC_PbxJlk8y8bWCjnsUXqgJ67q43c--E6_vRPvdtrkGpfC3NmX7H6fkgdXE8Cv8F4kZzW4JnVVG74IIoNbiHhiYK-0YlTtaK_ouE7MODxwtJAohyQJcEP8ABhgYhQGKQ";

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