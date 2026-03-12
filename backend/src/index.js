require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = () => {
  try {
    app.listen(PORT, () => {
      console.log(`
      🚀 Server started successfully!
      📡 Listening on port: ${PORT}
      🌍 Environment: ${process.env.NODE_ENV || 'development'}
      🔗 API URL: http://localhost:${PORT}/api
      `);
    });
  } catch (error) {
    console.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
