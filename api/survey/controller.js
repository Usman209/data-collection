const mongoose = require('mongoose');
const moment = require('moment');
const Queue = require('bull');
const bullMaster = require('bull-master');

// Redis configuration for Bull queue
const redisOptions = {
    host: 'localhost',
    port: 6379,
    lifo: false,
    removeOnComplete: true,
    removeOnFail: true
};

// Define a queue for data processing
const syncDataQueue = new Queue('syncDataQueue', { redis: redisOptions });

// Create BullMaster instance to monitor the queue
const bullMasterApp = bullMaster({
    queues: [syncDataQueue]  // Pass the queue you want to monitor
});

bullMasterApp.getQueues();
bullMasterApp.setQueues([syncDataQueue]);

// Function to dynamically create schema based on incoming data type
function createDynamicSchema() {
    const schemaDefinition = {
        data: { type: mongoose.Schema.Types.Mixed } // Store all data as a JSON object
    };
    return new mongoose.Schema(schemaDefinition);
}

// Function to check if a collection exists and insert data
async function insertDataDynamically(type, data, currentDate) {
    try {
        const collectionName = `${type}_${currentDate}`;
        
        // Prepare the current date and time
        const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');

        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionExists = collections.some(col => col.name === collectionName);

        let dynamicModel;

        // Check if model already exists to prevent overwriting
        if (mongoose.models[collectionName]) {
            dynamicModel = mongoose.model(collectionName); // Use the existing model
        } else {
            const schema = createDynamicSchema();
            dynamicModel = mongoose.model(collectionName, schema, collectionName); // Create a new model
        }

        for (const record of data) {
            try {
                // Add the "isProcessed" flag and the current date/time to each record
                const processedRecord = {
                    ...record,
                    isProcessed: false,  // Add the "isProcessed" flag
                    addedAtServer: currentDateTime  // Add the current date and time
                };

                // Insert the record using the dynamic model
                await dynamicModel.create({ data: processedRecord });
            } catch (error) {
                console.error(`Error inserting record into ${collectionName} collection:`, error);
            }
        }

        console.log(`Successfully inserted ${data.length} records into ${collectionName} collection`);
    } catch (error) {
        console.error(`Error in insertDataDynamically for type ${type}:`, error);
    }
}

// Main endpoint to sync collected data
exports.syncCollectedData = async (req, res) => {
    try {
        const collectedDataArray = req.body;
        const { data } = collectedDataArray;

        const currentDate = moment().format('YYYY-MM-DD');

        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({
                message: 'Data is empty. Please provide data to sync.'
            });
        }

        const response = {
            message: 'Data received. We will process your records soon.',
            code: 200
        };
        res.status(200).json(response);

        // Add job to the Redis queue for background processing
        await syncDataQueue.add({
            collectedDataArray,
            currentDate
        });

        console.log('Data successfully queued for processing');
    } catch (error) {
        console.error('Error in syncCollectedData:', error);
        if (!res.headersSent) {
            return res.status(500).json({
                message: 'An error occurred while processing your request.'
            });
        }
    }
};

// Queue processor to handle the data processing in the background
syncDataQueue.process(5, async (job) => {
    try {
        const { collectedDataArray, currentDate } = job.data;
        const { data } = collectedDataArray;

        for (const typeGroup of data) {
            const { type, records } = typeGroup;

            if (type && Array.isArray(records) && records.length > 0) {
                await insertDataDynamically(type, records, currentDate);
            } else {
                console.error(`Invalid or missing data for type: ${type}`);
            }
        }

        console.log('Data successfully processed from queue');
    } catch (error) {
        console.error('Error in queue processing:', error);
        throw error;
    }
});

// Expose the BullMaster app for monitoring in other files
exports.bullMasterApp = bullMasterApp;
