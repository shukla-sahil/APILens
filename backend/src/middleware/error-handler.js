function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.originalUrl} was not found`
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Unexpected error',
    details: err.details || null
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
