const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/task');
const migrate = require('./migrations/migrate');
const { authenticate } = require('./middleware/authMiddleware');
const cors = require("cors");

const app = express();
const PORT = 3000;


app.use(cors());
app.use(bodyParser.json());

// Authentication routes
app.use('/auth', authRoutes);

// Task routes (protected)
app.use('/tasks', authenticate, taskRoutes);

(async () => {
  await migrate.runMigrations();

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();