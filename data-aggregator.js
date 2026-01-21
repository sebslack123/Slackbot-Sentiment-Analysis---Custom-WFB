/**
 * Data Aggregator Service
 * Combines Reddit and Bing Search results into a unified format for Claude analysis
 */

class DataAggregator {
  /**
   * Aggregate Reddit and Bing search results
   * @param {Object} redditData - Reddit search results
   * @param {Object} bingData - Bing search results
   * @param {string} brand - Brand name being analyzed
   * @param {string} timeRange - Time range of analysis
   * @returns {Object} - Aggregated and structured data
   */
  static aggregateResults(redditData, bingData, brand, timeRange) {
    // Extract data from Reddit
    const reddit = {
      posts: redditData.posts || [],
      totalMentions: redditData.posts ? redditData.posts.length : 0,
      sentiment: redditData.sentiment || { avgScore: 0, totalEngagement: 0, sentiment: 'neutral' },
      formattedText: redditData.formattedText || ''
    };

    // Extract data from Bing
    const linkedin = {
      results: bingData.linkedin || [],
      totalResults: bingData.linkedin ? bingData.linkedin.length : 0
    };

    const twitter = {
      results: bingData.twitter || [],
      totalResults: bingData.twitter ? bingData.twitter.length : 0
    };

    const reviews = {
      results: bingData.reviews || [],
      totalResults: bingData.reviews ? bingData.reviews.length : 0
    };

    const blogs = {
      results: bingData.blogs || [],
      totalResults: bingData.blogs ? bingData.blogs.length : 0
    };

    // Calculate aggregate statistics
    const aggregateStats = this.calculateMetrics(reddit, linkedin, twitter, reviews, blogs, timeRange);

    // Determine data source status
    const dataSource = this.determineDataSource(reddit, bingData);

    // Create unified formatted text for Claude
    const formattedForClaude = this.formatForClaudeAnalysis(
      reddit,
      linkedin,
      twitter,
      reviews,
      blogs,
      brand,
      timeRange,
      aggregateStats
    );

    return {
      reddit,
      linkedin,
      twitter,
      reviews,
      blogs,
      aggregateStats,
      dataSource,
      formattedForClaude
    };
  }

  /**
   * Calculate aggregate metrics across all platforms
   * @param {Object} reddit - Reddit data
   * @param {Object} linkedin - LinkedIn data
   * @param {Object} twitter - Twitter data
   * @param {Object} reviews - Reviews data
   * @param {Object} blogs - Blogs data
   * @param {string} timeRange - Time range
   * @returns {Object} - Aggregate statistics
   */
  static calculateMetrics(reddit, linkedin, twitter, reviews, blogs, timeRange) {
    const totalSources =
      reddit.totalMentions +
      linkedin.totalResults +
      twitter.totalResults +
      reviews.totalResults +
      blogs.totalResults;

    const platformsWithData = [];
    if (reddit.totalMentions > 0) platformsWithData.push('Reddit');
    if (linkedin.totalResults > 0) platformsWithData.push('LinkedIn');
    if (twitter.totalResults > 0) platformsWithData.push('Twitter/X');
    if (reviews.totalResults > 0) platformsWithData.push('Review Sites');
    if (blogs.totalResults > 0) platformsWithData.push('Blogs');

    return {
      totalSources,
      dateRange: timeRange,
      platforms: platformsWithData,
      platformBreakdown: {
        reddit: reddit.totalMentions,
        linkedin: linkedin.totalResults,
        twitter: twitter.totalResults,
        reviews: reviews.totalResults,
        blogs: blogs.totalResults
      },
      redditSentiment: reddit.sentiment.sentiment,
      redditAvgScore: reddit.sentiment.avgScore
    };
  }

  /**
   * Determine data source type
   * @param {Object} reddit - Reddit data
   * @param {Object} bingData - Bing data
   * @returns {string} - Data source status
   */
  static determineDataSource(reddit, bingData) {
    const hasReddit = reddit.totalMentions > 0;
    const hasBing = bingData.totalResults > 0;

    if (hasReddit && hasBing) {
      return 'real-time';
    } else if (hasReddit || hasBing) {
      return 'partial';
    } else {
      return 'fallback';
    }
  }

  /**
   * Format aggregated data for Claude analysis
   * @param {Object} reddit - Reddit data
   * @param {Object} linkedin - LinkedIn data
   * @param {Object} twitter - Twitter data
   * @param {Object} reviews - Reviews data
   * @param {Object} blogs - Blogs data
   * @param {string} brand - Brand name
   * @param {string} timeRange - Time range
   * @param {Object} stats - Aggregate statistics
   * @returns {string} - Formatted text for Claude
   */
  static formatForClaudeAnalysis(reddit, linkedin, twitter, reviews, blogs, brand, timeRange, stats) {
    let formatted = `You are analyzing REAL social listening data collected from APIs for the brand: ${brand}\n\n`;
    formatted += `TIME RANGE: Last ${timeRange}\n`;
    formatted += `TOTAL SOURCES: ${stats.totalSources} mentions across ${stats.platforms.length} platforms\n`;
    formatted += `PLATFORMS: ${stats.platforms.join(', ')}\n\n`;

    formatted += `====================================\n`;
    formatted += `PLATFORM BREAKDOWN:\n`;
    formatted += `- Reddit: ${stats.platformBreakdown.reddit} posts (avg sentiment: ${stats.redditSentiment})\n`;
    formatted += `- LinkedIn: ${stats.platformBreakdown.linkedin} results\n`;
    formatted += `- Twitter/X: ${stats.platformBreakdown.twitter} results\n`;
    formatted += `- Review Sites: ${stats.platformBreakdown.reviews} results\n`;
    formatted += `- Blogs: ${stats.platformBreakdown.blogs} results\n`;
    formatted += `====================================\n\n`;

    // Add Reddit data
    if (reddit.formattedText && reddit.formattedText.length > 0) {
      formatted += reddit.formattedText + '\n\n';
    }

    // Add LinkedIn data
    if (linkedin.totalResults > 0) {
      formatted += `LINKEDIN DATA (${linkedin.totalResults} results):\n\n`;
      linkedin.results.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   URL: ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    // Add Twitter data
    if (twitter.totalResults > 0) {
      formatted += `TWITTER/X DATA (${twitter.totalResults} results):\n\n`;
      twitter.results.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   URL: ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    // Add Review Sites data
    if (reviews.totalResults > 0) {
      formatted += `REVIEW SITES DATA (${reviews.totalResults} results from G2, Capterra, TrustRadius):\n\n`;
      reviews.results.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   URL: ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    // Add Blogs data
    if (blogs.totalResults > 0) {
      formatted += `BLOGS & FORUMS DATA (${blogs.totalResults} results):\n\n`;
      blogs.results.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   URL: ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    formatted += `====================================\n\n`;
    formatted += `ANALYSIS INSTRUCTIONS:\n`;
    formatted += `Based on the REAL data above (${stats.totalSources} total sources), provide a comprehensive social listening analysis.\n`;
    formatted += `All source citations MUST reference the actual URLs provided above.\n`;
    formatted += `Focus on actual sentiment, trends, and insights found in the real data.\n\n`;

    return formatted;
  }

  /**
   * Deduplicate entries across platforms
   * (Removes URLs that appear in multiple platform results)
   * @param {Object} aggregatedData - Aggregated data object
   * @returns {Object} - Deduplicated data
   */
  static deduplicateEntries(aggregatedData) {
    const seenUrls = new Set();

    // Deduplicate Bing results
    ['linkedin', 'twitter', 'reviews', 'blogs'].forEach(platform => {
      if (aggregatedData[platform] && aggregatedData[platform].results) {
        aggregatedData[platform].results = aggregatedData[platform].results.filter(result => {
          if (seenUrls.has(result.url)) {
            return false;
          }
          seenUrls.add(result.url);
          return true;
        });
        aggregatedData[platform].totalResults = aggregatedData[platform].results.length;
      }
    });

    // Update aggregate stats after deduplication
    const totalSources =
      aggregatedData.reddit.totalMentions +
      aggregatedData.linkedin.totalResults +
      aggregatedData.twitter.totalResults +
      aggregatedData.reviews.totalResults +
      aggregatedData.blogs.totalResults;

    aggregatedData.aggregateStats.totalSources = totalSources;

    return aggregatedData;
  }
}

/**
 * Main export function
 * @param {Object} redditData - Reddit search results
 * @param {Object} bingData - Bing search results
 * @param {string} brand - Brand name
 * @param {string} timeRange - Time range
 * @returns {Object} - Aggregated data
 */
function aggregateResults(redditData, bingData, brand, timeRange) {
  const aggregated = DataAggregator.aggregateResults(redditData, bingData, brand, timeRange);
  const deduplicated = DataAggregator.deduplicateEntries(aggregated);

  console.log(`📊 Aggregated ${deduplicated.aggregateStats.totalSources} total sources from ${deduplicated.aggregateStats.platforms.length} platforms`);
  console.log(`📊 Data source status: ${deduplicated.dataSource}`);

  return deduplicated;
}

module.exports = { DataAggregator, aggregateResults };
