require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'info'
};
