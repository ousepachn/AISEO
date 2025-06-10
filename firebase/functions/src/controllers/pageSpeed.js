const axios = require('axios');
const { db } = require('../firebaseInit');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Analyzes the PageSpeed performance of a website
 * @param {Object} data - The analysis request data
 * @returns {Promise<Object>} - The analysis results
 */
exports.analyzePageSpeed = async (data) => {
  try {
    // Validate input data
    if (!data || !data.url) {
      throw new Error('Invalid input: URL is required');
    }

    // Create analysis record
    const analysisRef = await db.collection(COLLECTIONS.ANALYSES).add({
      type: 'pagespeed',
      url: data.url,
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // TODO: Implement actual PageSpeed API call
    // For now, return a mock response
    const result = {
      analysisId: analysisRef.id,
      status: 'completed',
      metrics: {
        performance: 85,
        accessibility: 90,
        bestPractices: 95,
        seo: 88
      },
      recommendations: [
        'Optimize images',
        'Enable text compression',
        'Minimize render-blocking resources'
      ]
    };

    // Update the analysis record with results
    await analysisRef.update({
      status: 'completed',
      results: result,
      updatedAt: new Date()
    });

    return result;
  } catch (error) {
    console.error('Error in analyzePageSpeed:', error);
    throw error;
  }
};

/**
 * Handles PageSpeed analysis requests from PubSub
 * @param {Object} message - The PubSub message
 * @returns {Promise<void>}
 */
exports.handlePageSpeedAnalysis = async (message) => {
  try {
    const { websiteUrl, reportId } = JSON.parse(Buffer.from(message.data, 'base64').toString());
    
    const result = await exports.analyzePageSpeed({ url: websiteUrl });

    // Store the result in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      pageSpeed: result,
      timestamp: new Date()
    }, { merge: true });

    return null;
  } catch (error) {
    console.error('Error in handlePageSpeedAnalysis:', error);
    // Store error in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      pageSpeed: { error: error.message },
      timestamp: new Date()
    }, { merge: true });
    throw error;
  }
}; 