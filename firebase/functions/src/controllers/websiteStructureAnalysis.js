const { db, pubSubClient } = require('../firebaseInit');
const { TOPICS, ANALYSIS_TYPES, COLLECTIONS } = require('../utils/constants');
const { analyzeWebsiteStructure } = require('./websiteStructure');

/**
 * Handles website structure analysis requests
 * @param {Object} data - The analysis request data
 * @returns {Promise<Object>} - The analysis results
 */
exports.handleWebsiteStructureAnalysis = async (data) => {
  try {
    // Validate input data
    if (!data || !data.url) {
      throw new Error('Invalid input: URL is required');
    }

    // Create analysis record
    const analysisRef = await db.collection(COLLECTIONS.ANALYSES).add({
      type: ANALYSIS_TYPES.WEBSITE_STRUCTURE,
      url: data.url,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Publish message to PubSub for async processing
    await pubSubClient.topic(TOPICS.WEBSITE_STRUCTURE_ANALYSIS).publish(Buffer.from(JSON.stringify({
      analysisId: analysisRef.id,
      url: data.url
    })));

    return {
      analysisId: analysisRef.id,
      status: 'processing',
      message: 'Analysis request received and queued for processing'
    };
  } catch (error) {
    console.error('Error in handleWebsiteStructureAnalysis:', error);
    throw error;
  }
}; 