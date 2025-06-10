const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Analyzes the structure of a website
 * @param {string} url - The URL of the website to analyze
 * @returns {Promise<Object>} - The analysis results
 */
exports.analyzeWebsiteStructure = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    return {
      robotsTxtFound: await checkRobotsTxt(url),
      sitemapXmlFound: await checkSitemapXml(url),
      h1TagsFound: $('h1').length > 0,
      imageAltsGood: checkImageAlts($),
      metaDescription: $('meta[name="description"]').attr('content'),
      titleTag: $('title').text(),
      recommendations: generateRecommendations($)
    };
  } catch (error) {
    console.error('Error analyzing website structure:', error);
    throw error;
  }
};

/**
 * Checks if robots.txt exists
 * @param {string} url - The base URL of the website
 * @returns {Promise<boolean>} - Whether robots.txt exists
 */
async function checkRobotsTxt(url) {
  try {
    const response = await axios.get(`${url}/robots.txt`);
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Checks if sitemap.xml exists
 * @param {string} url - The base URL of the website
 * @returns {Promise<boolean>} - Whether sitemap.xml exists
 */
async function checkSitemapXml(url) {
  try {
    const response = await axios.get(`${url}/sitemap.xml`);
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Checks if all images have alt tags
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {boolean} - Whether all images have alt tags
 */
function checkImageAlts($) {
  let hasMissingAlts = false;
  $('img').each((i, elem) => {
    if (!$(elem).attr('alt')) {
      hasMissingAlts = true;
      return false; // break the loop
    }
  });
  return !hasMissingAlts;
}

/**
 * Generates recommendations based on website structure analysis
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {string[]} - List of recommendations
 */
function generateRecommendations($) {
  const recommendations = [];
  
  // Check for meta description
  if (!$('meta[name="description"]').length) {
    recommendations.push('Add a meta description tag');
  }
  
  // Check for title tag
  if (!$('title').length) {
    recommendations.push('Add a title tag');
  }
  
  // Check for H1 tag
  if (!$('h1').length) {
    recommendations.push('Add an H1 tag');
  }
  
  // Check for image alt tags
  $('img').each((i, elem) => {
    if (!$(elem).attr('alt')) {
      recommendations.push('Add alt tags to all images');
      return false;
    }
  });
  
  return recommendations;
} 