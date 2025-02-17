'use strict';
const { sendResponse, errReturned } = require('./lib/dto');

const { HOST, PORT,SESS_SECRET } = require("./config/config");

module.exports = (app) => {

  app.use('/api/data', require('./api/survey'));
  
};


