const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const authRoutes = require('./routes/auth');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const initializeSchema = require('./db/schema');

// Start Server
if (require.main === module) {
  initializeSchema().then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to initialize database schema on startup', err);
    process.exit(1);
  });
}

module.exports = app;
