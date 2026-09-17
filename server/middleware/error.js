function notFound(req, res) {
  res.status(404).json({ message: `No route matches ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ValidationError') {
    const fields = Object.fromEntries(
      Object.entries(err.errors).map(([key, val]) => [key, val.message])
    );
    return res.status(400).json({ message: 'Some fields need attention.', fields });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `That ${field} is already registered.` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'That record id is not valid.' });
  }

  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
}

module.exports = { notFound, errorHandler };
