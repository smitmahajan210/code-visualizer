const express = require('express');
const cors = require('cors');
const analyzeCodeRouter = require('./routes/analyzeCode');
const traceRouter = require('./routes/trace');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', analyzeCodeRouter);
app.use('/api', traceRouter);

// Handle malformed JSON bodies (e.g. bad escapes) with a clean 400.
app.use((err, req, res, next) => {
  if (err && err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  return next(err);
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Code Visualizer API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
