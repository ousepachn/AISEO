const admin = require('../firebaseInit');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const { COLLECTIONS, ANALYSIS_TYPES, AI_SERVICES } = require('../utils/constants');
const config = require('../config/environment');

const db = getFirestore();

/**
 * Gets the current AI service configuration
 * Returns default configuration for local testing
 */
async function getAIConfig() {
  return AI_SERVICES; // Return default config for local testing
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

async function callGeminiAPI(websiteUrl, industry, serviceConfig, analysisType, companyName) {
  try {
    const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
    console.log('Using Vertex AI:', useVertexAI);
    
    const model = serviceConfig.model;
    const promptTemplate = serviceConfig.promptTemplates[analysisType];
    
    if (!promptTemplate) {
      throw new Error(`No prompt template found for analysis type: ${analysisType}`);
    }

    // Add safe fallbacks
    const safeCompanyName = companyName && companyName.trim() !== '' ? companyName : 'the company';
    const safeWebsiteUrl = websiteUrl && websiteUrl.trim() !== '' ? websiteUrl : 'the website';
    const safeIndustry = industry && industry.trim() !== '' ? industry : 'the industry';

    const prompt = promptTemplate
      .replace('{websiteUrl}', safeWebsiteUrl)
      .replace('{url}', safeWebsiteUrl)
      .replace('{industry}', safeIndustry)
      .replace('{companyName}', safeCompanyName)
      .replace('{company}', safeCompanyName);

    console.log('Sending prompt to Gemini:', prompt);

    let response;
    if (useVertexAI) {
      response = await callVertexAI(prompt, model);
    } else {
      response = await callGeminiDirect(prompt, model);
    }

    return response;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

async function callGeminiDirect(prompt, model) {
  // For direct Gemini API, you may need to use API key auth (not Vertex)
  // This is a placeholder; adjust as needed for your use case
  throw new Error('Direct Gemini API is not supported with @google/genai. Use Vertex AI.');
}

async function callVertexAI(prompt, model) {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
  });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return {
    text: response.text,
    model,
    // Usage metadata is not available in this API, so omit for now
  };
}

async function callClaudeAPI(url, industry, config, analysisType, companyName = null) {
  const apiKey = config.claudeApiKey;
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
  const apiKey = config.chatGptApiKey;
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

/**
 * HTTP endpoint for direct company analysis
 */
exports.analyzeCompany = async (data) => {
  const { url, industry, companyName: providedCompanyName } = data;
  
  if (!url) {
    throw new Error('URL is required');
  }

  try {
    // Get current AI configuration
    const aiConfig = await getAIConfig();
    const serviceConfig = aiConfig[ANALYSIS_TYPES.GEMINI]; // Default to Gemini

    // Check if service is enabled
    if (!serviceConfig || !serviceConfig.enabled) {
      throw new Error('AI service is disabled or not configured');
    }

    // Use provided companyName if available, otherwise extract from URL
    const companyName = providedCompanyName && providedCompanyName.trim() !== ''
      ? providedCompanyName
      : extractCompanyName(url);

    // Make API call for company analysis
    const result = await callGeminiAPI(url, industry, serviceConfig, 'companyAnalysis', companyName);

    return {
      status: 'completed',
      result,
      model: serviceConfig.model,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error in company analysis:', error);
    throw error;
  }
};

exports.getAIConfig = getAIConfig;
exports.extractCompanyName = extractCompanyName;
exports.callGeminiAPI = callGeminiAPI; 