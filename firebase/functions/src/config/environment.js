const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Determine the current environment
const NODE_ENV = process.env.NODE_ENV || 'local';

// Try multiple possible locations for the .env file
const possiblePaths = [
  path.resolve(__dirname, '../../', `.env.${NODE_ENV}`),  // functions/.env.local
  path.resolve(__dirname, '../../', '.env'),             // functions/.env
  path.resolve(__dirname, '../../../', `.env.${NODE_ENV}`), // root/.env.local
  path.resolve(__dirname, '../../../', '.env'),          // root/.env
];

console.log('Searching for .env file in:', possiblePaths);

// Try each path
let envPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    envPath = p;
    console.log('Found .env file at:', envPath);
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found in any of the expected locations. Using environment variables from process.env');
}

// Log all environment variables for debugging
console.log('Environment variables loaded:', {
  NODE_ENV,
  MYAPP_GOOGLE_CLOUD_PROJECT: process.env.MYAPP_GOOGLE_CLOUD_PROJECT,
  MYAPP_GOOGLE_CLOUD_LOCATION: process.env.MYAPP_GOOGLE_CLOUD_LOCATION,
  MYAPP_GOOGLE_GENAI_USE_VERTEXAI: process.env.MYAPP_GOOGLE_GENAI_USE_VERTEXAI,
  MYAPP_GEMINI_API_KEY: process.env.MYAPP_GEMINI_API_KEY ? '***' : undefined,
  MYAPP_CLAUDE_API_KEY: process.env.MYAPP_CLAUDE_API_KEY ? '***' : undefined,
  MYAPP_CHATGPT_API_KEY: process.env.MYAPP_CHATGPT_API_KEY,
  MYAPP_PAGESPEED_API_KEY: process.env.MYAPP_PAGESPEED_API_KEY ? '***' : undefined,
  MYAPP_FIREBASE_PROJECT_ID: process.env.MYAPP_FIREBASE_PROJECT_ID,
});

// Environment configuration
const config = {
  // Environment
  env: NODE_ENV,
  
  // API Keys
  geminiApiKey: process.env.MYAPP_GEMINI_API_KEY,
  claudeApiKey: process.env.MYAPP_CLAUDE_API_KEY,
  chatGptApiKey: process.env.MYAPP_CHATGPT_API_KEY,
  pageSpeedApiKey: process.env.MYAPP_PAGESPEED_API_KEY,
  
  // Google Cloud Configuration
  googleCloud: {
    projectId: process.env.MYAPP_GOOGLE_CLOUD_PROJECT || 'aiseo-ff704',
    location: process.env.MYAPP_GOOGLE_CLOUD_LOCATION || 'global',
    useVertexAI: process.env.MYAPP_GOOGLE_GENAI_USE_VERTEXAI === 'true'
  },
  
  // Firebase Configuration
  firebaseConfig: {
    projectId: process.env.MYAPP_FIREBASE_PROJECT_ID || 'aiseo-ff704',
    storageBucket: process.env.MYAPP_FIREBASE_STORAGE_BUCKET,
    locationId: process.env.MYAPP_FIREBASE_LOCATION_ID,
  },
  
  // Function Configuration
  functions: {
    region: process.env.MYAPP_FIREBASE_FUNCTIONS_REGION || 'us-central1',
    timeoutSeconds: parseInt(process.env.MYAPP_FUNCTION_TIMEOUT_SECONDS || '300', 10),
    memory: process.env.MYAPP_FUNCTION_MEMORY || '256MB',
  },
  
  // Logging
  logging: {
    level: process.env.MYAPP_LOG_LEVEL || 'info',
    enabled: process.env.MYAPP_ENABLE_LOGGING !== 'false',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'MYAPP_GEMINI_API_KEY',
  'MYAPP_CLAUDE_API_KEY',
  'MYAPP_CHATGPT_API_KEY',
  'MYAPP_PAGESPEED_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = config; 