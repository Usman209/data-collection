const Redis = require('ioredis');
const { REDIS_HOST, REDIS_PORT } = require('../config/config'); // Import only from config.js

const redisClient = new Redis({
  host: REDIS_HOST, 
  port: REDIS_PORT,
});

module.exports = redisClient;
