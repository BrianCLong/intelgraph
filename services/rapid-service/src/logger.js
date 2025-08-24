const pino = require('pino');
const config = require('./config');

const logger = pino({ level: config.logLevel });

module.exports = logger;
