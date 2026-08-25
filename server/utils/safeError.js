const sendError = (res, error, fallback = 'Something went wrong') => {
  if (error?.status && error.status < 500) {
    return res.status(error.status).json({ message: error.message || fallback });
  }
  console.error(error);
  return res.status(500).json({ message: fallback });
};

module.exports = { sendError };
