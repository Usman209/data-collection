const express = require('express');
const router = express.Router();
const surveyController = require('./controller'); // Adjust the path as needed

// POST route to sync collected data
router.post('/', surveyController.syncCollectedData); // Create a new survey


module.exports = router;
