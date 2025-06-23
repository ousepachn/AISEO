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
  // Create a deep copy to avoid modifying the original constant
  const services = JSON.parse(JSON.stringify(AI_SERVICES));

  // Inject API keys from the central config into each service
  if (services[ANALYSIS_TYPES.GEMINI]) {
    services[ANALYSIS_TYPES.GEMINI].geminiApiKey = config.geminiApiKey;
  }
  if (services[ANALYSIS_TYPES.CLAUDE]) {
    services[ANALYSIS_TYPES.CLAUDE].claudeApiKey = config.claudeApiKey;
  }
  if (services[ANALYSIS_TYPES.CHATGPT]) {
    services[ANALYSIS_TYPES.CHATGPT].chatGptApiKey = config.chatGptApiKey;
  }
  
  return services;
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
exports.handleAIAnalysis = async (event) => {
  console.log('Starting AI analysis with message:', event.data.message);
  
  const { websiteUrl, industry, reportId, analysisType } = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
  console.log('Decoded message data:', { websiteUrl, industry, reportId, analysisType });
  
  try {
    // Get current AI configuration
    console.log('Fetching AI configuration...');
    const aiConfig = await getAIConfig();
    const serviceConfig = aiConfig[analysisType];
    console.log('AI configuration loaded for:', analysisType);

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
    console.log('Getting API call function for:', analysisType);
    const apiCallFunction = getAPICallFunction(analysisType);
    if (!apiCallFunction) {
      throw new Error(`No API call function found for ${analysisType}`);
    }

    // Extract company name from URL
    const companyName = extractCompanyName(websiteUrl);
    console.log('Extracted company name:', companyName);

    console.log('Starting API calls for analysis...');
    // Make API calls for both SEO and company analysis
    const [seoResult, companyResult] = await Promise.all([
      apiCallFunction(websiteUrl, industry, serviceConfig, 'seoAnalysis', companyName),
      apiCallFunction(websiteUrl, industry, serviceConfig, 'companyAnalysis', companyName)
    ]);
    console.log('API calls completed successfully');

    // Store the results in Firestore
    console.log('Storing results in Firestore...');
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      [analysisType]: {
        seoAnalysis: {
          ...seoResult,
        },
        companyAnalysis: {
          ...companyResult,
        },
        status: 'completed',
        model: serviceConfig.model,
        timestamp: new Date()
      }
    }, { merge: true });
    console.log('Results stored successfully');

    return null;
  } catch (error) {
    console.error('Detailed error in AI analysis:', {
      analysisType,
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    // Store error in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      [analysisType]: {
        status: 'error',
        error: error.message,
        timestamp: new Date()
      }
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
    console.log('Starting Gemini API call with config:', {
      useVertexAI: process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true',
      model: serviceConfig.model,
      analysisType,
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION
    });
    
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

    console.log('Prepared prompt for Gemini:', prompt);

    let response;
    if (useVertexAI) {
      console.log('Initializing Vertex AI call...');
      response = await callVertexAI(prompt, model);
      console.log('Vertex AI call completed');
    } else {
      console.log('Initializing direct Gemini call...');
      response = await callGeminiDirect(prompt, model);
      console.log('Direct Gemini call completed');
    }

    console.log('Gemini API call successful, response structure:', {
      hasText: !!response?.text,
      model: response?.model,
      responseType: typeof response
    });

    return response;
  } catch (error) {
    console.error('Detailed Gemini API error:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

async function callGeminiDirect(prompt, model) {
  // For direct Gemini API, you may need to use API key auth (not Vertex)
  // This is a placeholder; adjust as needed for your use case
  throw new Error('Direct Gemini API is not supported with @google/genai. Use Vertex AI.');
}

async function callVertexAI(prompt, model) {
  console.log('Starting Vertex AI setup with:', {
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'global'
  });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
  });

  console.log('Initialized GoogleGenAI client, making API call...');

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    console.log('Vertex AI response received:', {
      hasResponse: !!response,
      hasText: !!response?.text,
      responseType: typeof response
    });

    return {
      text: response.text,
      model,
    };
  } catch (error) {
    console.error('Vertex AI call failed:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    throw error;
  }
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

  // Format response to match Gemini's format
  return {
    text: response.data.choices[0].message.content,
    model: config.model,
    // Include usage data if available
    usage: response.data.usage || null
  };
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