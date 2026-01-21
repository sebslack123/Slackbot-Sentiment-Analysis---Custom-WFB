const Anthropic = require('@anthropic-ai/sdk');
const { searchReddit } = require('./reddit-service');
const { searchBing } = require('./search-service');
const { aggregateResults } = require('./data-aggregator');

class SocialListeningService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async analyzeBrandSentiment(brand, competitors = '', timeRange = '7 days', platforms = 'all') {
    try {
      console.log(`Starting social listening analysis for: ${brand}`);
      console.log(`Time range: ${timeRange}, Platforms: ${platforms}`);

      // Try to fetch real-time data from APIs
      let useRealData = false;
      let aggregatedData = null;

      try {
        console.log('🚀 Fetching real-time data from Reddit and Bing APIs...');

        // Fetch data from Reddit and Bing in parallel
        const [redditData, bingData] = await Promise.all([
          searchReddit(brand, timeRange),
          searchBing(brand, platforms)
        ]);

        console.log(`📊 Reddit: ${redditData.posts.length} posts`);
        console.log(`📊 Bing: ${bingData.totalResults} results`);

        // Aggregate the results
        aggregatedData = aggregateResults(redditData, bingData, brand, timeRange);

        // Check if we have enough real data to use
        if (aggregatedData.aggregateStats.totalSources > 0) {
          useRealData = true;
          console.log('✅ Using real-time API data for analysis');
        } else {
          console.log('⚠️ No real-time data found, falling back to Claude knowledge');
        }

      } catch (apiError) {
        console.error('⚠️ API fetch error, falling back to Claude knowledge:', apiError.message);
        useRealData = false;
      }

      // Choose analysis method based on data availability
      let analysisResult;
      if (useRealData && aggregatedData) {
        analysisResult = await this.analyzeWithRealData(brand, competitors, timeRange, platforms, aggregatedData);
      } else {
        analysisResult = await this.analyzeWithClaudeKnowledge(brand, competitors, timeRange, platforms);
      }

      // Add data source indicator
      analysisResult.dataSource = aggregatedData ? aggregatedData.dataSource : 'fallback';

      return analysisResult;

    } catch (error) {
      console.error('Error in analyzeBrandSentiment:', error);

      return {
        sentimentSummary: 'Error: Unable to complete social listening analysis. Please check API credentials and try again.',
        positiveHighlights: '',
        negativeConcerns: 'Analysis error occurred.',
        trendingTopics: '',
        competitiveInsights: '',
        fullReport: `# Social Listening Analysis Error\n\n**Error:** ${error.message}\n\n**Time:** ${new Date().toISOString()}`,
        hasCriticalIssues: true,
        timestamp: new Date().toISOString(),
        dataSource: 'error'
      };
    }
  }

  async analyzeWithRealData(brand, competitors, timeRange, platforms, aggregatedData) {
    console.log('📝 Building enhanced prompt with real API data...');

    const prompt = this.buildEnhancedPrompt(brand, competitors, timeRange, platforms, aggregatedData);

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log('Claude response received, processing...');

    let fullResponse = '';
    for (const content of message.content) {
      if (content.type === 'text') {
        fullResponse += content.text;
      }
    }

    const parsed = this.parseResponse(fullResponse);

    // Add data source note to full report
    parsed.fullReport = `# Social Listening Report (Real-Time Data)\n\n` +
      `**Data Source:** ${aggregatedData.dataSource === 'real-time' ? '✅ Real-time API data' : '⚠️ Partial API data'}\n` +
      `**Sources:** ${aggregatedData.aggregateStats.totalSources} mentions across ${aggregatedData.aggregateStats.platforms.join(', ')}\n` +
      `**Brand:** ${brand}\n` +
      `**Time Range:** ${timeRange}\n` +
      `**Generated:** ${new Date().toISOString()}\n\n` +
      `---\n\n` +
      fullResponse;

    return parsed;
  }

  async analyzeWithClaudeKnowledge(brand, competitors, timeRange, platforms) {
    console.log('📝 Using Claude knowledge fallback (no real-time data)...');

    const prompt = this.buildSocialListeningPrompt(brand, competitors, timeRange, platforms);

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log('Claude response received, processing...');

    let fullResponse = '';
    for (const content of message.content) {
      if (content.type === 'text') {
        fullResponse += content.text;
      }
    }

    const parsed = this.parseResponse(fullResponse);

    // Add fallback note to full report
    parsed.fullReport = `# Social Listening Report (Training Data Fallback)\n\n` +
      `**Data Source:** ⚠️ Using Claude training data (API data unavailable)\n` +
      `**Brand:** ${brand}\n` +
      `**Time Range:** ${timeRange}\n` +
      `**Generated:** ${new Date().toISOString()}\n\n` +
      `---\n\n` +
      fullResponse;

    return parsed;
  }

  buildEnhancedPrompt(brand, competitors, timeRange, platforms, aggregatedData) {
    const today = new Date().toISOString().split('T')[0];

    return `You are a social listening and brand monitoring specialist analyzing REAL data collected from APIs.

**Brand to Monitor:** ${brand}
${competitors ? `**Competitors for Comparison:** ${competitors}` : ''}
**Time Range:** Last ${timeRange}
**Platforms Analyzed:** ${aggregatedData.aggregateStats.platforms.join(', ')}

====================================
REAL DATA COLLECTED FROM APIS:
====================================

${aggregatedData.formattedForClaude}

====================================

**CRITICAL OUTPUT FORMAT REQUIREMENTS:**

Your output MUST be concise and crisp for Slack channel posting. Follow these rules EXACTLY:

1. **EXACTLY 3 bullet points per section** (no more, no less)
2. **Use bullet point symbol (•)** not numbers or dashes
3. **Each bullet: maximum 1-2 sentences**
4. **ALWAYS include source citation** from the REAL data above - use actual URLs provided
5. **Total output must be under 250 words**
6. **Prioritize top 3 most impactful insights per section**

**Output Format - Structure your analysis EXACTLY as follows:**

📊 **SENTIMENT BREAKDOWN**
• [Percentage breakdown: X% positive, Y% neutral, Z% negative with total volume from REAL data]
• [Overall trend: improving/stable/declining based on engagement and scores from REAL data]
• [Key sentiment drivers: what's driving the sentiment with actual sources from data]

✅ **POSITIVE HIGHLIGHTS**
• [Concise positive highlight #1 with specific detail] (source: [actual URL from data above])
• [Concise positive highlight #2 with specific detail] (source: [actual URL from data above])
• [Concise positive highlight #3 with specific detail] (source: [actual URL from data above])

⚠️ **CRITICAL CONCERNS**
• [Severity level]: [Concise concern #1 with impact] (source: [actual URL from data above])
• [Severity level]: [Concise concern #2 with impact] (source: [actual URL from data above])
• [Severity level]: [Concise concern #3 with impact] (source: [actual URL from data above])
[Note: If no critical concerns exist, format as: • No critical issues identified in monitoring period (source: comprehensive review)]

🔥 **TRENDING TOPICS**
• [Topic #1]: [Brief context and why it matters] ([X mentions, source: platform])
• [Topic #2]: [Brief context and why it matters] ([X mentions, source: platform])
• [Topic #3]: [Brief context and why it matters] ([X mentions, source: platform])

🎯 **COMPETITIVE INSIGHTS**
• [Competitive insight #1 comparing to specific competitor] (source: [actual URL from data above])
• [Competitive insight #2 comparing to specific competitor] (source: [actual URL from data above])
• [Competitive insight #3 comparing to specific competitor] (source: [actual URL from data above])

**MANDATORY FORMAT RULES:**
- Do NOT add any sections beyond these 5
- Do NOT use numbered lists (1, 2, 3) - only bullet symbols (•)
- Do NOT exceed 3 bullets per section under any circumstances
- Do NOT fabricate sources - only use URLs from the REAL data provided above
- Do NOT write paragraphs - keep to 1-2 sentences maximum per bullet
- Target ~220 words total for ideal readability

**Current Date:** ${today}
**Analysis Focus:** ${aggregatedData.aggregateStats.totalSources} real sources from last ${timeRange}

Provide your analysis based ONLY on the real data above.`;
  }

  buildSocialListeningPrompt(brand, competitors, timeRange, platforms) {
    const today = new Date().toISOString().split('T')[0];

    // Parse platform preferences
    const platformList = platforms === 'all' || !platforms
      ? 'LinkedIn, X/Twitter, Reddit, review sites (G2, Capterra, TrustRadius), blogs, and forums'
      : platforms;

    // Extract brand domain for exclusion (simple heuristic)
    const brandDomain = brand.toLowerCase().replace(/\s+/g, '');

    return `You are a social listening and brand monitoring specialist. Analyze recent online conversations, mentions, and feedback about the specified brand across multiple platforms.

**Brand to Monitor:** ${brand}
${competitors ? `**Competitors for Comparison:** ${competitors}` : ''}
**Time Range:** Last ${timeRange}
**Platforms to Analyze:** ${platformList}

**Search Strategy - Use these query patterns:**

1. **LinkedIn Posts & Discussions:**
   - "${brand} feedback" site:linkedin.com
   - "${brand} review" site:linkedin.com
   - "${brand} experience" site:linkedin.com
   - Exclude official posts: -site:linkedin.com/company/${brandDomain}

2. **Twitter/X Mentions:**
   - "${brand}" site:twitter.com OR site:x.com
   - "${brand} complaint" OR "${brand} problem"
   - Sentiment indicators: "${brand} love" OR "${brand} frustrated"
   - Exclude brand's own account: -from:@${brandDomain}

3. **Reddit Discussions:**
   - "${brand}" site:reddit.com
   - "${brand} alternative" site:reddit.com
   - "${brand} vs" site:reddit.com
   - Focus on: r/SaaS, r/technology, r/entrepreneur, r/startups, industry-specific subreddits

4. **Review Sites:**
   - "${brand}" site:g2.com OR site:capterra.com OR site:trustradius.com
   - "${brand} rating" OR "${brand} review"
   - Recent reviews with low ratings (1-3 stars)

5. **Blogs & Forums:**
   - "${brand}" (site:medium.com OR site:dev.to OR site:hashnode.com)
   - "${brand} tutorial" OR "${brand} how to"
   - "${brand}" site:stackoverflow.com OR site:news.ycombinator.com

6. **Competitive Comparisons:**
${competitors ? `   - "${brand} vs ${competitors.split(',')[0].trim()}"
   - "${competitors.split(',')[0].trim()} better than ${brand}"
   - "switch from ${brand} to"` : '   - Search for general competitive mentions'}

7. **Exclude Official Sources:**
   - Add these exclusions: -site:${brandDomain}.com -site:help.${brandDomain}.com

**Analysis Requirements:**

1. **Sentiment Analysis** - Calculate distribution:
   - Positive mentions (%)
   - Neutral mentions (%)
   - Negative mentions (%)
   - Total volume of conversations
   - Sentiment trend (improving/declining/stable)

2. **Positive Highlights** - Extract:
   - Most praised features or capabilities
   - Customer success stories
   - Brand advocates and influencers
   - Specific examples with quotes and sources

3. **Critical Concerns** - Identify:
   - Recurring complaints or pain points
   - Feature requests or gaps
   - Customer churn signals
   - Support or service issues
   - Specific examples with quotes and sources
   - Urgency level (critical/moderate/minor)

4. **Trending Topics** - Discover:
   - Most frequently discussed themes
   - Emerging patterns in conversations
   - Viral posts or discussions
   - Industry trends affecting brand perception
   - Change in discussion volume over time

5. **Competitive Insights** - Compare:
   - How ${brand} is positioned vs competitors
   - Features customers prefer in alternatives
   - Pricing comparisons mentioned
   - Migration patterns (to/from competitors)
${competitors ? `   - Specific comparisons with: ${competitors}` : ''}

**CRITICAL OUTPUT FORMAT REQUIREMENTS:**

Your output MUST be concise and crisp for Slack channel posting. Follow these rules EXACTLY:

1. **EXACTLY 3 bullet points per section** (no more, no less)
2. **Use bullet point symbol (•)** not numbers or dashes
3. **Each bullet: maximum 1-2 sentences**
4. **ALWAYS include source citation in parentheses** at the end of each bullet
   - Format: (source: LinkedIn) or (source: reddit.com/r/SaaS) or (source: G2.com)
5. **Total output must be under 250 words**
6. **Prioritize top 3 most impactful insights per section**

**Output Format - Structure your analysis EXACTLY as follows:**

📊 **SENTIMENT BREAKDOWN**
• [Percentage breakdown: X% positive, Y% neutral, Z% negative with total volume]
• [Overall trend: improving/stable/declining over time period with brief context]
• [Key sentiment drivers: what's driving the sentiment with source if available]

✅ **POSITIVE HIGHLIGHTS**
• [Concise positive highlight #1 with specific detail] (source: [platform or URL])
• [Concise positive highlight #2 with specific detail] (source: [platform or URL])
• [Concise positive highlight #3 with specific detail] (source: [platform or URL])

⚠️ **CRITICAL CONCERNS**
• [Severity level]: [Concise concern #1 with impact] (source: [platform or URL])
• [Severity level]: [Concise concern #2 with impact] (source: [platform or URL])
• [Severity level]: [Concise concern #3 with impact] (source: [platform or URL])
[Note: If no critical concerns exist, format as: • No critical issues identified in monitoring period (source: comprehensive review)]

🔥 **TRENDING TOPICS**
• [Topic #1]: [Brief context and why it matters] ([X mentions, source: platform])
• [Topic #2]: [Brief context and why it matters] ([X mentions, source: platform])
• [Topic #3]: [Brief context and why it matters] ([X mentions, source: platform])

🎯 **COMPETITIVE INSIGHTS**
• [Competitive insight #1 comparing to specific competitor] (source: [platform or URL])
• [Competitive insight #2 comparing to specific competitor] (source: [platform or URL])
• [Competitive insight #3 comparing to specific competitor] (source: [platform or URL])

**MANDATORY FORMAT RULES:**
- Do NOT add any sections beyond these 5
- Do NOT use numbered lists (1, 2, 3) - only bullet symbols (•)
- Do NOT exceed 3 bullets per section under any circumstances
- Do NOT omit source citations - every bullet must have a source
- Do NOT write paragraphs - keep to 1-2 sentences maximum per bullet
- Target ~220 words total for ideal readability

**Current Date:** ${today}
**Analysis Focus:** Recent ${timeRange} across ${platformList}

Provide a comprehensive social listening report based on your knowledge and analysis of brand sentiment, customer feedback, and market conversations.`;
  }

  parseResponse(responseText) {
    try {
      const sections = {
        sentimentSummary: '',
        positiveHighlights: '',
        negativeConcerns: '',
        trendingTopics: '',
        competitiveInsights: '',
        hasCriticalIssues: false,
        fullReport: responseText,
        timestamp: new Date().toISOString()
      };

      // Extract sections using regex patterns matching emoji headers
      // Pattern explanation: Match emoji + bold header, capture content until next section or end

      // 📊 SENTIMENT BREAKDOWN
      const sentimentMatch = responseText.match(
        /📊\s*\*\*SENTIMENT BREAKDOWN\*\*(.*?)(?=✅|⚠️|🔥|🎯|💡|$)/s
      );

      // ✅ POSITIVE HIGHLIGHTS
      const positiveMatch = responseText.match(
        /✅\s*\*\*POSITIVE HIGHLIGHTS\*\*(.*?)(?=⚠️|🔥|🎯|💡|📊|$)/s
      );

      // ⚠️ CRITICAL CONCERNS
      const concernsMatch = responseText.match(
        /⚠️\s*\*\*CRITICAL CONCERNS\*\*(.*?)(?=🔥|🎯|💡|📊|✅|$)/s
      );

      // 🔥 TRENDING TOPICS
      const trendingMatch = responseText.match(
        /🔥\s*\*\*TRENDING TOPICS\*\*(.*?)(?=🎯|💡|📊|✅|⚠️|$)/s
      );

      // 🎯 COMPETITIVE INSIGHTS
      const competitiveMatch = responseText.match(
        /🎯\s*\*\*COMPETITIVE INSIGHTS\*\*(.*?)(?=📊|✅|⚠️|🔥|$)/s
      );

      // Extract and clean sections
      if (sentimentMatch) {
        sections.sentimentSummary = sentimentMatch[1].trim();
      }

      if (positiveMatch) {
        sections.positiveHighlights = positiveMatch[1].trim();
      }

      if (concernsMatch) {
        sections.negativeConcerns = concernsMatch[1].trim();

        // Determine if there are critical issues
        // Check for actual content and exclude "no critical" statements
        const concernsLower = sections.negativeConcerns.toLowerCase();
        sections.hasCriticalIssues =
          sections.negativeConcerns.length > 0 &&
          !concernsLower.includes('no critical concerns') &&
          !concernsLower.includes('no significant concerns') &&
          !concernsLower.includes('no critical issues');
      }

      if (trendingMatch) {
        sections.trendingTopics = trendingMatch[1].trim();
      }

      if (competitiveMatch) {
        sections.competitiveInsights = competitiveMatch[1].trim();
      }

      // Validation: Check if at least one section was parsed
      const hasContent =
        sections.sentimentSummary ||
        sections.positiveHighlights ||
        sections.negativeConcerns ||
        sections.trendingTopics ||
        sections.competitiveInsights;

      if (!hasContent) {
        // Fallback: Unable to parse structured response
        console.warn('Unable to parse structured sections from response');
        sections.sentimentSummary = 'Unable to extract sentiment data from response.';
        sections.negativeConcerns = 'Manual review of full report required.';
      }

      console.log('Successfully parsed social listening response');
      console.log('Critical issues detected:', sections.hasCriticalIssues);

      return sections;

    } catch (error) {
      console.error('Error parsing social listening response:', error);

      // Error fallback
      return {
        sentimentSummary: 'Error: Unable to parse sentiment analysis.',
        positiveHighlights: '',
        negativeConcerns: 'Error occurred during analysis parsing.',
        trendingTopics: '',
        competitiveInsights: '',
        hasCriticalIssues: true,
        fullReport: responseText || 'No response received from Claude.',
        timestamp: new Date().toISOString()
      };
    }
  }
}

async function analyzeSocialListening(brand, competitors = '', timeRange = '7 days', platforms = 'all') {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const service = new SocialListeningService(apiKey);
  return await service.analyzeBrandSentiment(brand, competitors, timeRange, platforms);
}

module.exports = { SocialListeningService, analyzeSocialListening };
