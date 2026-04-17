const express = require('express');
const cors = require('cors');
const analyzeCodeRouter = require('./routes/analyzeCode');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', analyzeCodeRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Code Visualizer API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
