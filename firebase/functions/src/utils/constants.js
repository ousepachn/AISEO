// Pub/Sub Topics
exports.TOPICS = {
  AI_ANALYSIS: 'ai-analysis',
  PAGESPEED_ANALYSIS: 'pagespeed-analysis',
  WEBSITE_STRUCTURE: 'website-structure',
  AGGREGATE_RESULTS: 'aggregate-results',
  GENERATE_PDF: 'generate-pdf-report'
};

// Analysis Types
exports.ANALYSIS_TYPES = {
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  CHATGPT: 'chatgpt',
  PAGESPEED: 'pagespeed',
  WEBSITE_STRUCTURE: 'website-structure'
};

// AI Service Configuration
exports.AI_SERVICES = {
  [exports.ANALYSIS_TYPES.GEMINI]: {
    enabled: true,
    model: 'gemini-pro',
    maxTokens: 2048,
    temperature: 0.7,
    promptTemplates: {
      seoAnalysis: 'Analyze the SEO and content quality of {url} for the {industry} industry. Focus on content relevance, keyword usage, and overall SEO effectiveness.',
      companyAnalysis: 'What do you know about {company} in the {industry} industry? Analyze their market position, strengths, and unique value propositions based on their website content.'
    }
  },
  [exports.ANALYSIS_TYPES.CLAUDE]: {
    enabled: true,
    model: 'claude-3-opus-20240229',
    maxTokens: 4096,
    temperature: 0.7,
    promptTemplates: {
      seoAnalysis: 'Analyze the SEO and content quality of {url} for the {industry} industry. Focus on content relevance, keyword usage, and overall SEO effectiveness.',
      companyAnalysis: 'What do you know about {company} in the {industry} industry? Analyze their market position, strengths, and unique value propositions based on their website content.'
    }
  },
  [exports.ANALYSIS_TYPES.CHATGPT]: {
    enabled: true,
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.7,
    promptTemplates: {
      seoAnalysis: 'Analyze the SEO and content quality of {url} for the {industry} industry. Focus on content relevance, keyword usage, and overall SEO effectiveness.',
      companyAnalysis: 'What do you know about {company} in the {industry} industry? Analyze their market position, strengths, and unique value propositions based on their website content.'
    }
  }
};

// Firestore Collections
exports.COLLECTIONS = {
  REPORTS: 'reports',
  ANALYSIS_RESULTS: 'analysis_results',
  AI_CONFIG: 'ai_config' // New collection for storing AI service configurations
}; 