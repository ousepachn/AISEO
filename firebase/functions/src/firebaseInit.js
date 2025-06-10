// Load environment variables from the project root .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const config = require('./config/environment');

// Initialize Firebase Admin only if it hasn't been initialized
if (!getApps().length) {
  initializeApp();
}

// Export initialized instances
const db = getFirestore();
const pubSubClient = new PubSub();

module.exports = {
  db,
  pubSubClient
}; 