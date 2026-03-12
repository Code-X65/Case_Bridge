const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = { errorHandler };
