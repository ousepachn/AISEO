const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const config = require('./config/environment');

// Initialize Firebase Admin only if it hasn't been initialized
if (!getApps().length) {
  initializeApp();
}

// Get Firestore instance
const db = getFirestore();

// Configure emulators for local development
if (process.env.NODE_ENV === 'local' || process.env.FUNCTIONS_EMULATOR === 'true') {
  console.log('Using Firestore emulator on port 8080');
  db.settings({
    host: 'localhost:8080',
    ssl: false
  });
}

// Initialize PubSub with emulator settings in local development
const pubSubOptions = process.env.NODE_ENV === 'local' ? {
  apiEndpoint: 'localhost:8085'
} : undefined;

const pubSubClient = new PubSub(pubSubOptions);

module.exports = {
  db,
  pubSubClient
}; 