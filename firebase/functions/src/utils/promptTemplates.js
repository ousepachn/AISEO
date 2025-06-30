// Prompt Templates for AI Analysis

const COMPANY_ANALYSIS_PROMPT = `Company Analysis Prompt
**CRITICAL: DO NOT HALLUCINATE. If you don't know something, explicitly state "I don't know" or "I have no knowledge of this company." Do not provide generic information.**

**IMPORTANT FORMATTING INSTRUCTION:**
ALWAYS format each section header on its own line, starting with:
## SECTION 1: STATIC KNOWLEDGE ASSESSMENT
## SECTION 2: INDUSTRY COMPETITIVE LANDSCAPE
## SECTION 3: MARKET RECOGNITION ASSESSMENT
Do NOT put any content on the same line as the section header. Each section header must be followed by a line break, then the content.

Analyzing: {company} | Industry: {industry} | Location: {location}

## SECTION 1: STATIC KNOWLEDGE ASSESSMENT
What specific information do you have about {company} from your training data?
- Company background and history
- Known products/services  
- Market reputation
- Notable achievements or news
- Key personnel or leadership

**If you have limited/no knowledge, state exactly:** "I have no/limited knowledge of {company} from my training data."

## SECTION 2: INDUSTRY COMPETITIVE LANDSCAPE
**Only mention companies you actually know. DO NOT invent names.**

Top 3 prominent {industry} companies in {location} (or broader market) from your training data:
1. [Company Name] - [Market position and why prominent]
2. [Company Name] - [Market position and why prominent]  
3. [Company Name] - [Market position and why prominent]

## SECTION 3: MARKET RECOGNITION ASSESSMENT
Based on your knowledge, rate the likelihood {company} would be mentioned when discussing {industry} leaders in {location}:
- **High:** Well-known industry player
- **Medium:** Recognized locally but not broadly  
- **Low:** Limited market recognition
- **Unknown:** No knowledge to assess

**Assessment:** [Rating] - [Brief explanation]`;

const SEO_ANALYSIS_PROMPT = `SEO Analysis Prompt
**CRITICAL: Analyze actual website content only. DO NOT force mentions of {company} in customer queries if unnatural.**

Analyzing: {url} | Industry: {industry} | Location: {location}

## SECTION 1: WEBSITE CONTENT ANALYSIS
**Visit {url} and analyze:**

### Core Business Elements
- Primary services/products offered
- Target customer segments
- Unique value propositions
- Geographic service areas mentioned

### SEO Content Quality
- Industry expertise demonstrated
- Educational/problem-solving content
- Local/geographic optimization for {location}
- Trust signals (testimonials, certifications, team info)

### Technical SEO Factors
- Page structure and organization
- Contact/location information prominence
- Mobile optimization
- Content depth and authority

## SECTION 2: AI DISCOVERABILITY TEST
**Create 3 realistic customer queries and respond naturally:**

**Query 1:** "I need help with [specific {industry} problem] in {location}"
- Your natural response:
- Would {company} be mentioned? [Yes/No]
- Why/Why not:

**Query 2:** "Best {industry} companies in {location}"  
- Your natural response:
- Would {company} be mentioned? [Yes/No]
- Why/Why not:

**Query 3:** "Who provides {industry} services near {location}?"
- Your natural response:
- Would {company} be mentioned? [Yes/No] 
- Why/Why not:

## SECTION 3: SEO OPTIMIZATION ASSESSMENT
**AI Discoverability Score:** [High/Medium/Low] - Mentioned in [X/3] queries

### Content Strengths:
- [Specific strong content areas]

### Critical Gaps:
- [Missing topics/optimization areas]

### Top 3 Recommendations:
1. **[Priority Level]:** [Specific action]
2. **[Priority Level]:** [Specific action]  
3. **[Priority Level]:** [Specific action]

**Bottom Line:** [1-2 sentences on AI SEO effectiveness and primary opportunity]`;

module.exports = {
  COMPANY_ANALYSIS_PROMPT,
  SEO_ANALYSIS_PROMPT
}; 