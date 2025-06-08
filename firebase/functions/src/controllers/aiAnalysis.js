const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const { COLLECTIONS, ANALYSIS_TYPES, AI_SERVICES } = require('../utils/constants');

const db = getFirestore();

/**
 * Gets the current AI service configuration from Firestore
 * Falls back to default configuration if not found
 */
async function getAIConfig() {
  try {
    const configDoc = await db.collection(COLLECTIONS.AI_CONFIG).doc('current').get();
    if (configDoc.exists) {
      return configDoc.data();
    }
  } catch (error) {
    console.error('Error fetching AI config:', error);
  }
  return AI_SERVICES; // Return default config if none found
}

/**
 * Updates the AI service configuration in Firestore
 */
exports.updateAIConfig = async (config) => {
  try {
    await db.collection(COLLECTIONS.AI_CONFIG).doc('current').set({
      ...config,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating AI config:', error);
    throw error;
  }
};

/**
 * Extracts company name from URL
 */
function extractCompanyName(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Remove www. and .com/.org/etc
    return hostname.replace(/^www\./, '').replace(/\.[^/.]+$/, '');
  } catch (error) {
    console.error('Error extracting company name:', error);
    return 'the company';
  }
}

/**
 * Handles AI analysis for a specific model
 */
exports.handleAIAnalysis = async (message) => {
  const { websiteUrl, industry, reportId, analysisType } = JSON.parse(Buffer.from(message.data, 'base64').toString());
  
  try {
    // Get current AI configuration
    const aiConfig = await getAIConfig();
    const serviceConfig = aiConfig[analysisType];

    // Check if service is enabled
    if (!serviceConfig || !serviceConfig.enabled) {
      console.log(`Service ${analysisType} is disabled or not configured`);
      await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
        [analysisType]: { 
          status: 'skipped',
          message: 'Service is disabled or not configured'
        },
        timestamp: new Date()
      }, { merge: true });
      return null;
    }

    // Get the appropriate API call function
    const apiCallFunction = getAPICallFunction(analysisType);
    if (!apiCallFunction) {
      throw new Error(`No API call function found for ${analysisType}`);
    }

    // Extract company name from URL
    const companyName = extractCompanyName(websiteUrl);

    // Make API calls for both SEO and company analysis
    const [seoResult, companyResult] = await Promise.all([
      apiCallFunction(websiteUrl, industry, serviceConfig, 'seoAnalysis', companyName),
      apiCallFunction(websiteUrl, industry, serviceConfig, 'companyAnalysis', companyName)
    ]);

    // Store the results in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      [analysisType]: {
        seoAnalysis: {
          ...seoResult,
          status: 'completed',
          model: serviceConfig.model,
          timestamp: new Date()
        },
        companyAnalysis: {
          ...companyResult,
          status: 'completed',
          model: serviceConfig.model,
          timestamp: new Date()
        }
      },
      timestamp: new Date()
    }, { merge: true });

    return null;
  } catch (error) {
    console.error(`Error in AI analysis (${analysisType}):`, error);
    // Store error in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      [analysisType]: {
        status: 'error',
        error: error.message,
        timestamp: new Date()
      },
      timestamp: new Date()
    }, { merge: true });
    throw error;
  }
};

/**
 * Returns the appropriate API call function for the given analysis type
 */
function getAPICallFunction(analysisType) {
  switch (analysisType) {
    case ANALYSIS_TYPES.GEMINI:
      return callGeminiAPI;
    case ANALYSIS_TYPES.CLAUDE:
      return callClaudeAPI;
    case ANALYSIS_TYPES.CHATGPT:
      return callChatGPTAPI;
    default:
      return null;
  }
}

/**
 * Formats the prompt using the template and parameters
 */
function formatPrompt(template, url, industry, companyName = null) {
  return template
    .replace('{url}', url)
    .replace('{industry}', industry)
    .replace('{company}', companyName || extractCompanyName(url));
}

async function callGeminiAPI(url, industry, config, analysisType, companyName = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
    contents: [{
      parts: [{
        text: formatPrompt(config.promptTemplates[analysisType], url, industry, companyName)
      }]
    }],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens
    }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return response.data;
}

async function callClaudeAPI(url, industry, config, analysisType, companyName = null) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: config.model,
    messages: [{
      role: 'user',
      content: formatPrompt(config.promptTemplates[analysisType], url, industry, companyName)
    }],
    max_tokens: config.maxTokens,
    temperature: config.temperature
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data;
}

async function callChatGPTAPI(url, industry, config, analysisType, companyName = null) {
  const apiKey = process.env.CHATGPT_API_KEY;
  if (!apiKey) throw new Error('ChatGPT API key not configured');

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: config.model,
    messages: [{
      role: 'user',
      content: formatPrompt(config.promptTemplates[analysisType], url, industry, companyName)
    }],
    max_tokens: config.maxTokens,
    temperature: config.temperature
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return response.data;
} 