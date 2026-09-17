require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/staff', require('./routes/staff'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
