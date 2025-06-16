require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const port = process.env.PORT || 3000;

// Configuration (replace with your actual credentials)
const config = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id_here',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here',
  SESSION_SECRET: process.env.SESSION_SECRET || 'supersecretkey123456789',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://mihirsheth2911:wx1mxUn2788jLdnl@cluster0.fvevtjx.mongodb.net/',
  BASE_URL: process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000'
};

const dbName = 'NANDA_Index';
let db;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: config.GOOGLE_CLIENT_ID,
  clientSecret: config.GOOGLE_CLIENT_SECRET,
  callbackURL: `${config.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Store user in session
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0].value
    };
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Connect to MongoDB
MongoClient.connect(config.MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch(error => console.error('MongoDB connection error:', error));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.json(null);
  }
});

// Get all agents
app.get('/api/agents', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const agents = await db.collection('agent_index').find({}).sort({ created_at: -1 }).toArray();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Add new agent (requires authentication)
app.post('/api/agents', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { username, agent_facts_link } = req.body;
    
    if (!username || !agent_facts_link) {
      return res.status(400).json({ error: 'Username and agent facts link are required' });
    }

    // Check if username already exists
    const existingAgent = await db.collection('agent_index').findOne({ username });
    if (existingAgent) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const agent = {
      username,
      agent_facts_link,
      created_at: new Date().toISOString(),
      source_agent_id: generateAgentId(),
      source_user_id: req.user.id,
      created_by_email: req.user.email
    };

    const result = await db.collection('agent_index').insertOne(agent);
    res.json({ ...agent, _id: result.insertedId });
  } catch (error) {
    console.error('Error adding agent:', error);
    res.status(500).json({ error: 'Failed to add agent' });
  }
});

// Update agent (requires authentication and ownership)
app.put('/api/agents/:id', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { id } = req.params;
    const { username, agent_facts_link } = req.body;

    if (!username || !agent_facts_link) {
      return res.status(400).json({ error: 'Username and agent facts link are required' });
    }

    // Check if agent exists and user owns it
    const existingAgent = await db.collection('agent_index').findOne({ _id: new ObjectId(id) });
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (existingAgent.source_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own agents' });
    }

    // Check if new username conflicts with existing ones (excluding current agent)
    const usernameConflict = await db.collection('agent_index').findOne({ 
      username, 
      _id: { $ne: new ObjectId(id) } 
    });
    if (usernameConflict) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const result = await db.collection('agent_index').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          username, 
          agent_facts_link,
          updated_at: new Date().toISOString()
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Agent not found or no changes made' });
    }

    res.json({ message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent (requires authentication and ownership)
app.delete('/api/agents/:id', requireAuth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const { id } = req.params;

    // Check if agent exists and user owns it
    const existingAgent = await db.collection('agent_index').findOne({ _id: new ObjectId(id) });
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (existingAgent.source_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own agents' });
    }

    const result = await db.collection('agent_index').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/data', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const agents = await db.collection('agent_index').find({}).toArray();
    res.json({ agent_index: agents });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Helper function to generate agent ID
function generateAgentId() {
  return 'agent-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
}

// Start server
app.listen(port, () => {
  console.log(`Server running at ${config.BASE_URL}`);
  console.log('Make sure to set your Google OAuth credentials!');
}); 