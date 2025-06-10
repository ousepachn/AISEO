// Load environment variables from the project root .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env.local') });

const { handleAIAnalysis } = require('../controllers/aiAnalysis');
const { ANALYSIS_TYPES } = require('../utils/constants');

// Mock message object
const createMockMessage = (websiteUrl, industry, reportId, analysisType) => ({
  data: Buffer.from(JSON.stringify({
    websiteUrl,
    industry,
    reportId,
    analysisType
  })).toString('base64')
});

// Test cases
const testCases = [
  {
    name: 'Test Gemini Analysis',
    websiteUrl: 'https://example.com',
    industry: 'technology',
    reportId: 'test-report-1',
    analysisType: ANALYSIS_TYPES.GEMINI
  },
  {
    name: 'Test Claude Analysis',
    websiteUrl: 'https://example.com',
    industry: 'technology',
    reportId: 'test-report-2',
    analysisType: ANALYSIS_TYPES.CLAUDE
  },
  {
    name: 'Test ChatGPT Analysis',
    websiteUrl: 'https://example.com',
    industry: 'technology',
    reportId: 'test-report-3',
    analysisType: ANALYSIS_TYPES.CHATGPT
  }
];

// Run tests
async function runTests() {
  console.log('Starting AI Analysis Tests...\n');

  for (const testCase of testCases) {
    console.log(`Running test: ${testCase.name}`);
    try {
      const message = createMockMessage(
        testCase.websiteUrl,
        testCase.industry,
        testCase.reportId,
        testCase.analysisType
      );

      await handleAIAnalysis(message);
      console.log('✅ Test passed\n');
    } catch (error) {
      console.error('❌ Test failed:', error.message, '\n');
    }
  }
}

// Run the tests
runTests().catch(console.error); 