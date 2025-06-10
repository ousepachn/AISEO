const { getFirestore } = require('firebase-admin/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const axios = require('axios');
const cheerio = require('cheerio');

const db = getFirestore();
const pubSubClient = new PubSub();

// Main analysis handler
exports.handleAnalysisRequest = async (req, res) => {
  const { websiteUrl, email, industry, location } = req.body;

  if (!websiteUrl) {
    return res.status(400).send({ error: 'Website URL is required.' });
  }

  try {
    // 1. Initiate all API calls in parallel
    const [geminiRes, claudeRes, chatgptRes, pagespeedRes, websiteStructureRes] = await Promise.allSettled([
      callGeminiAPI(websiteUrl, industry),
      callClaudeAPI(websiteUrl, industry),
      callChatGPTAPI(websiteUrl, industry),
      callPageSpeedAPI(websiteUrl),
      analyzeWebsiteStructure(websiteUrl)
    ]);
    
    // 2. Aggregate results
    const analysisResults = {
      aiComparison: {
        gemini: geminiRes.status === 'fulfilled' ? geminiRes.value : { error: 'Failed to analyze with Gemini' },
        claude: claudeRes.status === 'fulfilled' ? claudeRes.value : { error: 'Failed to analyze with Claude' },
        chatgpt: chatgptRes.status === 'fulfilled' ? chatgptRes.value : { error: 'Failed to analyze with ChatGPT' }
      },
      seoAnalysis: {
        pageSpeed: pagespeedRes.status === 'fulfilled' ? pagespeedRes.value : { error: 'Failed to get PageSpeed insights' },
        websiteStructure: websiteStructureRes.status === 'fulfilled' ? websiteStructureRes.value : { error: 'Failed to analyze website structure' }
      }
    };

    // 3. Save the full report to Firestore
    const reportRef = await db.collection('reports').add({
      websiteUrl,
      email: email || null,
      submittedAt: new Date(),
      status: 'completed',
      analysisResults,
    });

    // 4. If email is provided, trigger PDF generation via Pub/Sub
    if (email) {
      const topicName = 'generate-pdf-report';
      const dataBuffer = Buffer.from(JSON.stringify({ 
        documentId: reportRef.id, 
        recipientEmail: email 
      }));
      await pubSubClient.topic(topicName).publishMessage({ data: dataBuffer });
    }

    // 5. Return the aggregated results to the frontend
    res.status(200).send(analysisResults);
  } catch (error) {
    console.error('Error in analysis:', error);
    res.status(500).send({ error: 'An internal server error occurred' });
  }
};

// Helper Functions for API Calls
async function callGeminiAPI(url, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
    contents: [{
      parts: [{
        text: `Analyze the SEO and content quality of ${url} for the ${industry} industry. Focus on content relevance, keyword usage, and overall SEO effectiveness.`
      }]
    }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return response.data;
}

async function callClaudeAPI(url, industry) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-opus-20240229',
    messages: [{
      role: 'user',
      content: `Analyze the SEO and content quality of ${url} for the ${industry} industry. Focus on content relevance, keyword usage, and overall SEO effectiveness.`
    }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data;
}

async function callChatGPTAPI(url, industry) {
  const apiKey = process.env.CHATGPT_API_KEY;
  if (!apiKey) throw new Error('ChatGPT API key not configured');

  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4-turbo-preview',
    messages: [{
      role: 'user',
      content: `Analyze the SEO and content quality of ${url} for the ${industry} industry. Focus on content relevance, keyword usage, and overall SEO effectiveness.`
    }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return response.data;
}

async function callPageSpeedAPI(url) {
  const apiKey = process.env.PAGESPEED_API_KEY;
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

async function analyzeWebsiteStructure(url) {
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
}

async function checkRobotsTxt(url) {
  try {
    const response = await axios.get(`${url}/robots.txt`);
    return response.status === 200;
  } catch {
    return false;
  }
}

async function checkSitemapXml(url) {
  try {
    const response = await axios.get(`${url}/sitemap.xml`);
    return response.status === 200;
  } catch {
    return false;
  }
}

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