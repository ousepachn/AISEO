const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const { COLLECTIONS } = require('../utils/constants');
const config = require('../config/environment');

const db = getFirestore();

/**
 * Handles PageSpeed analysis for a website
 */
exports.handlePageSpeedAnalysis = async (message) => {
  const { websiteUrl, reportId } = JSON.parse(Buffer.from(message.data, 'base64').toString());
  
  try {
    const result = await callPageSpeedAPI(websiteUrl);

    // Store the result in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      pageSpeed: result,
      timestamp: new Date()
    }, { merge: true });

    return null;
  } catch (error) {
    console.error('Error in PageSpeed analysis:', error);
    // Store error in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      pageSpeed: { error: error.message },
      timestamp: new Date()
    }, { merge: true });
    throw error;
  }
};

async function callPageSpeedAPI(url) {
  const apiKey = config.pageSpeedApiKey;
  if (!apiKey) throw new Error('PageSpeed API key not configured');

  const [mobileRes, desktopRes] = await Promise.all([
    axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&key=${apiKey}`),
    axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=desktop&key=${apiKey}`)
  ]);

  return {
    mobile: mobileRes.data,
    desktop: desktopRes.data
  };
} 