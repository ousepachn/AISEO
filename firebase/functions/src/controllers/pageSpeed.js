const axios = require('axios');
const { db } = require('../firebaseInit');
const { COLLECTIONS } = require('../utils/constants');
const config = require('../config/environment');
const { GoogleAuth } = require('google-auth-library');

/**
 * Processes the raw PageSpeed Insights API data to extract key metrics.
 * @param {Object} data - The raw JSON response from the PageSpeed API.
 * @returns {Object} A summarized object with key performance indicators.
 */
function processPageSpeedData(data) {
  if (!data || !data.lighthouseResult) {
    return { error: 'Incomplete PageSpeed data received' };
  }

  const result = data.lighthouseResult;
  const audits = result.audits;

  return {
    score: result.categories.performance.score * 100, // Score is 0-1, so multiply by 100
    metrics: {
      firstContentfulPaint: audits['first-contentful-paint']?.displayValue,
      largestContentfulPaint: audits['largest-contentful-paint']?.displayValue,
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue,
      speedIndex: audits['speed-index']?.displayValue,
      totalBlockingTime: audits['total-blocking-time']?.displayValue,
    },
    lighthouseVersion: result.lighthouseVersion,
    fetchTime: result.fetchTime,
  };
}

/**
 * Calls the Google PageSpeed Insights API
 * @param {string} url - The URL to analyze
 * @returns {Promise<Object>} - The PageSpeed analysis results
 */
async function callPageSpeedAPI(url) {
  const apiKey = config.pageSpeedApiKey;

  if (!apiKey || apiKey === 'your-pagespeed-api-key') {
    const errorMsg = 'PageSpeed API key is not configured. Please set MYAPP_PAGESPEED_API_KEY in your .env file.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}`;
    
    const [mobileRes, desktopRes] = await Promise.all([
      axios.get(`${apiEndpoint}&strategy=mobile&key=${apiKey}`),
      axios.get(`${apiEndpoint}&strategy=desktop&key=${apiKey}`)
    ]);

    return {
      mobile: processPageSpeedData(mobileRes.data),
      desktop: processPageSpeedData(desktopRes.data)
    };
  } catch (error) {
    console.error('Error calling PageSpeed API with API Key:', error.response ? error.response.data : error.message);
    throw error;
  }
}

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

    const result = await callPageSpeedAPI(data.url);

    // Create analysis record in Firestore
    const analysisRef = await db.collection(COLLECTIONS.ANALYSES).add({
      type: 'pagespeed',
      url: data.url,
      status: 'completed',
      results: result,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return { ...result, analysisId: analysisRef.id };
  } catch (error) {
    console.error('Error in analyzePageSpeed:', error);
    throw error;
  }
};

/**
 * Handles PageSpeed analysis requests from PubSub
 * @param {Object} event - The PubSub event
 * @returns {Promise<void>}
 */
exports.handlePageSpeedAnalysis = async (event) => {
  let reportId; // Declare reportId here to make it available in the catch block
  try {
    const { websiteUrl, reportId: parsedReportId } = JSON.parse(Buffer.from(event.data.message.data, 'base64').toString());
    reportId = parsedReportId; // Assign the parsed ID
    
    const result = await callPageSpeedAPI(websiteUrl);

    // Store the result in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      pageSpeed: {
        ...result,
        status: 'completed',
        timestamp: new Date()
      }
    }, { merge: true });

    return null;
  } catch (error) {
    console.error('Error in handlePageSpeedAnalysis:', error);
    // Store error in Firestore
    await db.collection(COLLECTIONS.ANALYSIS_RESULTS).doc(reportId).set({
      pageSpeed: { 
        error: error.message,
        status: 'error',
        timestamp: new Date()
      }
    }, { merge: true });
    throw error;
  }
}; 