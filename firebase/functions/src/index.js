// Load environment variables first
require('dotenv').config();

// Import Firebase Functions v2 modules
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { setGlobalOptions } = require('firebase-functions/v2');

// Import controllers and utilities
const { handleAIAnalysis, updateAIConfig } = require('./controllers/aiAnalysis');
const { handlePageSpeedAnalysis } = require('./controllers/pageSpeed');
const { handleWebsiteStructureAnalysis } = require('./controllers/websiteStructure');
const { handleReportCompletion } = require('./controllers/analysis');
const { TOPICS, ANALYSIS_TYPES, COLLECTIONS } = require('./utils/constants');
const { db, pubSubClient } = require('./firebaseInit');
const config = require('./config/environment');

// Set global options for all functions
setGlobalOptions({
  region: config.functions.region,
  timeoutSeconds: config.functions.timeoutSeconds,
  memory: config.functions.memory,
});

// Import controllers
const aiAnalysisController = require('./controllers/aiAnalysis');
const pageSpeedController = require('./controllers/pageSpeed');
const websiteStructureController = require('./controllers/websiteStructure');

// Add this helper function near the top
function buildSimplifiedPrompts({ company, industry, location }) {
  return {
    companyAnalysis: {
      "STATIC KNOWLEDGE ASSESSMENT": `What specific information do you have about ${company} from your training data?`,
      "INDUSTRY COMPETITIVE LANDSCAPE": `Who are the top 3 prominent ${industry} companies in ${location} from your training data?`,
      "MARKET RECOGNITION ASSESSMENT": `How likely is ${company} to be mentioned as an ${industry} leader in ${location}?`
    },
    seoAnalysis: {
      "WEBSITE CONTENT ANALYSIS": `What are the primary services/products, target customers, and unique value propositions mentioned on ${company}'s website?`,
      "AI DISCOVERABILITY TEST": `Would ${company} be mentioned in realistic customer queries for ${industry} services in ${location}?`,
      "SEO OPTIMIZATION ASSESSMENT": `What are the strengths, gaps, and top recommendations for improving ${company}'s website SEO for ${location}?`
    }
  };
}

/**
 * Main HTTP endpoint that initiates the analysis process
 */
exports.analyze = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MB',
}, async (req, res) => {
  console.log('[analyze] Function triggered.');
  const { websiteUrl, email, industry, location, companyName, enabledServices } = req.body;
  console.log('[analyze] Request body:', { websiteUrl, email, industry, companyName, enabledServices });

  if (!websiteUrl) {
    console.log('[analyze] Error: Website URL is required.');
    return res.status(400).send({ error: 'Website URL is required.' });
  }

  try {
    console.log('[analyze] Creating initial report document in Firestore...');
    // Build simplified prompts
    const prompts = buildSimplifiedPrompts({
      company: companyName,
      industry,
      location
    });
    // Create initial report document
    const reportRef = await db.collection(COLLECTIONS.REPORTS).add({
      websiteUrl,
      email: email || null,
      submittedAt: new Date(),
      status: 'processing',
      enabledServices: enabledServices || [ANALYSIS_TYPES.GEMINI, ANALYSIS_TYPES.CLAUDE, ANALYSIS_TYPES.CHATGPT],
      prompts
    });
    console.log('[analyze] Report document created with ID:', reportRef.id);

    const reportId = reportRef.id;

    console.log('[analyze] Publishing messages to Pub/Sub...');
    // Trigger AI analysis for each enabled model
    for (const analysisType of (enabledServices || [ANALYSIS_TYPES.GEMINI, ANALYSIS_TYPES.CLAUDE, ANALYSIS_TYPES.CHATGPT])) {
      console.log(`[analyze] Publishing message for ${analysisType}...`);
      const dataBuffer = Buffer.from(JSON.stringify({
        websiteUrl,
        industry,
        companyName,
        location,
        reportId,
        analysisType
      }));
      await pubSubClient.topic(TOPICS.AI_ANALYSIS).publishMessage({ data: dataBuffer });
      console.log(`[analyze] Message for ${analysisType} published.`);
    }

    // Trigger PageSpeed analysis
    console.log('[analyze] Publishing message for PageSpeed analysis...');
    const pageSpeedBuffer = Buffer.from(JSON.stringify({
      websiteUrl,
      reportId
    }));
    await pubSubClient.topic(TOPICS.PAGESPEED_ANALYSIS).publishMessage({ data: pageSpeedBuffer });
    console.log('[analyze] Message for PageSpeed analysis published.');

    // Trigger website structure analysis
    console.log('[analyze] Publishing message for website structure analysis...');
    const structureBuffer = Buffer.from(JSON.stringify({
      websiteUrl,
      reportId
    }));
    await pubSubClient.topic(TOPICS.WEBSITE_STRUCTURE).publishMessage({ data: structureBuffer });
    console.log('[analyze] Message for website structure analysis published.');

    console.log('[analyze] All messages published. Sending success response.');
    // Return the report ID to the client
    res.status(200).send({ 
      reportId,
      message: 'Analysis started successfully. Results will be available shortly.'
    });
  } catch (error) {
    console.error('[analyze] Error initiating analysis:', error);
    res.status(500).send({ error: 'Failed to initiate analysis' });
  }
});

/**
 * Endpoint to manage AI service configuration
 */
exports.manageAIConfig = onRequest({
  cors: true,
  timeoutSeconds: 60,
  memory: '256MB',
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method not allowed' });
  }

  try {
    const { action, config } = req.body;

    switch (action) {
      case 'update':
        if (!config) {
          return res.status(400).send({ error: 'Configuration is required' });
        }
        await updateAIConfig(config);
        res.status(200).send({ message: 'Configuration updated successfully' });
        break;

      case 'get':
        const currentConfig = await db.collection(COLLECTIONS.AI_CONFIG).doc('current').get();
        res.status(200).send(currentConfig.exists ? currentConfig.data() : {});
        break;

      default:
        res.status(400).send({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error managing AI config:', error);
    res.status(500).send({ error: 'Failed to manage AI configuration' });
  }
});

/**
 * Pub/Sub function for AI analysis
 */
exports.handleAIAnalysis = onMessagePublished({
  topic: TOPICS.AI_ANALYSIS,
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '256MB',
}, async (event) => {
  return handleAIAnalysis(event);
});

/**
 * Pub/Sub function for PageSpeed analysis
 */
exports.handlePageSpeedAnalysis = onMessagePublished({
  topic: TOPICS.PAGESPEED_ANALYSIS,
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '256MB',
}, async (event) => {
  return handlePageSpeedAnalysis(event);
});

/**
 * Pub/Sub function for website structure analysis
 */
exports.handleWebsiteStructureAnalysis = onMessagePublished({
  topic: TOPICS.WEBSITE_STRUCTURE,
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '256MB',
}, async (event) => {
  return handleWebsiteStructureAnalysis(event);
});

/**
 * Firestore trigger to aggregate results when an analysis is complete
 */
exports.aggregateResults = onDocumentUpdated({
  document: `${COLLECTIONS.ANALYSIS_RESULTS}/{reportId}`,
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MB',
}, handleReportCompletion);

/**
 * Pub/Sub function for PDF generation
 */
exports.generateAndSendPdf = onMessagePublished({
  topic: TOPICS.GENERATE_PDF,
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: '1GB',
}, async (event) => {
  const payload = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
  console.log(`Generating PDF for doc: ${payload.documentId} to be sent to ${payload.recipientEmail}`);
  
  // TODO: Implement PDF generation and email sending logic
  // This will be implemented in a separate PR
  
  return null;
});

// HTTP Functions
exports.analyzeCompany = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  try {
    const result = await aiAnalysisController.analyzeCompany(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in analyzeCompany:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.analyzePageSpeed = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  try {
    const result = await pageSpeedController.analyzePageSpeed(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in analyzePageSpeed:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.analyzeWebsiteStructure = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  try {
    const result = await websiteStructureController.analyzeWebsiteStructure(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in analyzeWebsiteStructure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scheduled Functions
exports.scheduledAnalysis = onSchedule({
  schedule: 'every 24 hours',
  timeZone: 'UTC',
  maxInstances: 1,
}, async (event) => {
  try {
    const result = await aiAnalysisController.analyzeCompany({
      url: 'https://example.com',
      // Add other required parameters
    });
    console.log('Scheduled analysis completed:', result);
  } catch (error) {
    console.error('Error in scheduled analysis:', error);
  }
});

// Firestore Triggers
exports.onAnalysisCreated = onDocumentCreated({
  document: 'analyses/{analysisId}',
  maxInstances: 10,
}, async (event) => {
  try {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }

    const data = snapshot.data();
    console.log('New analysis created:', data);

    // Process the new analysis
    // Add your processing logic here
  } catch (error) {
    console.error('Error processing new analysis:', error);
  }
});

// PubSub Triggers
exports.onAnalysisRequested = onMessagePublished({
  topic: 'analysis-requests',
  maxInstances: 10,
}, async (event) => {
  try {
    const message = event.data.message;
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    console.log('Received analysis request:', data);

    // Process the analysis request
    // Add your processing logic here
  } catch (error) {
    console.error('Error processing analysis request:', error);
  }
});

/**
 * Direct HTTP endpoint for analysis (without PubSub)
 */
exports.analyzeDirect = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: '256MB',
}, async (req, res) => {
  const { websiteUrl, industry, enabledServices } = req.body;
  console.log('Request body:', { websiteUrl, industry, enabledServices });

  if (!websiteUrl) {
    return res.status(400).send({ error: 'Website URL is required.' });
  }

  try {
    // Get current AI configuration
    const aiConfig = await aiAnalysisController.getAIConfig();
    console.log('AI Config:', JSON.stringify(aiConfig, null, 2));
    
    const serviceType = enabledServices?.[0] || ANALYSIS_TYPES.GEMINI;
    console.log('Service Type:', serviceType);
    
    const serviceConfig = aiConfig[serviceType];
    console.log('Service Config:', JSON.stringify(serviceConfig, null, 2));

    // Check if service is enabled
    if (!serviceConfig) {
      throw new Error(`Service configuration not found for ${serviceType}`);
    }
    if (!serviceConfig.enabled) {
      throw new Error(`Service ${serviceType} is disabled`);
    }

    // Extract company name from URL
    const companyName = aiAnalysisController.extractCompanyName(websiteUrl);
    console.log('Company Name:', companyName);

    // Make API call for company analysis
    const result = await aiAnalysisController.callGeminiAPI(
      websiteUrl,
      industry,
      serviceConfig,
      'companyAnalysis',
      companyName
    );

    res.status(200).send({
      status: 'completed',
      result,
      model: serviceConfig.model,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in direct analysis:', error);
    res.status(500).send({ error: error.message });
  }
}); 