const snoowrap = require('snoowrap');

class RedditService {
  constructor(clientId, clientSecret, userAgent) {
    if (!clientId || !clientSecret) {
      throw new Error('Reddit API credentials are required');
    }

    this.reddit = new snoowrap({
      userAgent: userAgent || 'social-listening-bot/1.0',
      clientId: clientId,
      clientSecret: clientSecret,
      // App-only authentication (no user context needed)
      grantType: snoowrap.grantType.CLIENT_CREDENTIALS
    });

    // Relevant subreddits for brand discussions
    this.targetSubreddits = [
      'SaaS',
      'technology',
      'startups',
      'entrepreneur',
      'smallbusiness',
      'Entrepreneur',
      'webdev',
      'programming',
      'software',
      'business'
    ];
  }

  /**
   * Search Reddit for brand mentions
   * @param {string} brand - Brand or product name to search for
   * @param {string} timeRange - Time range ('7 days', '24 hours', '30 days')
   * @returns {Promise<Array>} - Array of relevant posts
   */
  async searchReddit(brand, timeRange = '7 days') {
    try {
      console.log(`🔍 Searching Reddit for brand: ${brand}, timeRange: ${timeRange}`);

      // Convert time range to Reddit's time filter format
      const timeFilter = this.parseTimeRange(timeRange);

      // Perform searches across multiple subreddits
      const searchPromises = this.targetSubreddits.map(subreddit =>
        this.searchSubreddit(brand, subreddit, timeFilter)
      );

      // Wait for all searches to complete
      const results = await Promise.all(searchPromises);

      // Flatten results and remove nulls
      const allPosts = results.flat().filter(post => post !== null);

      console.log(`✅ Found ${allPosts.length} total Reddit posts`);

      // Filter by relevance and remove spam
      const relevantPosts = this.filterByRelevance(allPosts, brand);

      console.log(`✅ Filtered to ${relevantPosts.length} relevant posts`);

      // Sort by engagement (upvotes + comments)
      const sortedPosts = this.sortByEngagement(relevantPosts);

      // Return top 20 most relevant posts
      return sortedPosts.slice(0, 20);

    } catch (error) {
      console.error('❌ Reddit API error:', error.message);
      throw new Error(`Reddit search failed: ${error.message}`);
    }
  }

  /**
   * Search a specific subreddit
   * @param {string} brand - Brand name
   * @param {string} subreddit - Subreddit name
   * @param {string} timeFilter - Reddit time filter
   * @returns {Promise<Array>} - Array of posts
   */
  async searchSubreddit(brand, subreddit, timeFilter) {
    try {
      const results = await this.reddit
        .getSubreddit(subreddit)
        .search({
          query: brand,
          time: timeFilter,
          sort: 'relevance',
          limit: 10
        });

      return results.map(post => this.extractPostData(post, subreddit));

    } catch (error) {
      console.warn(`⚠️ Could not search r/${subreddit}:`, error.message);
      return [];
    }
  }

  /**
   * Extract relevant data from a Reddit post
   * @param {Object} post - Reddit post object
   * @param {string} subreddit - Subreddit name
   * @returns {Object} - Extracted post data
   */
  extractPostData(post, subreddit) {
    return {
      id: post.id,
      title: post.title,
      body: post.selftext || '',
      subreddit: subreddit,
      upvotes: post.ups || 0,
      downvotes: post.downs || 0,
      score: post.score || 0,
      numComments: post.num_comments || 0,
      permalink: `https://reddit.com${post.permalink}`,
      created: new Date(post.created_utc * 1000).toISOString(),
      author: post.author ? post.author.name : '[deleted]',
      url: post.url || ''
    };
  }

  /**
   * Filter posts by relevance and remove spam
   * @param {Array} posts - Array of posts
   * @param {string} brand - Brand name to match
   * @returns {Array} - Filtered posts
   */
  filterByRelevance(posts, brand) {
    const brandLower = brand.toLowerCase();

    return posts.filter(post => {
      // Remove deleted/removed posts
      if (post.author === '[deleted]' || post.title.includes('[removed]')) {
        return false;
      }

      // Must contain brand name in title or body (case-insensitive)
      const titleLower = post.title.toLowerCase();
      const bodyLower = post.body.toLowerCase();
      const containsBrand = titleLower.includes(brandLower) || bodyLower.includes(brandLower);

      if (!containsBrand) {
        return false;
      }

      // Remove very low engagement posts (likely spam or irrelevant)
      if (post.score < 1 && post.numComments === 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort posts by engagement (upvotes + comments)
   * @param {Array} posts - Array of posts
   * @returns {Array} - Sorted posts
   */
  sortByEngagement(posts) {
    return posts.sort((a, b) => {
      const engagementA = a.score + (a.numComments * 2); // Weight comments higher
      const engagementB = b.score + (b.numComments * 2);
      return engagementB - engagementA;
    });
  }

  /**
   * Extract basic sentiment from posts
   * @param {Array} posts - Array of posts
   * @returns {Object} - Sentiment analysis
   */
  extractSentiment(posts) {
    if (posts.length === 0) {
      return {
        avgScore: 0,
        totalEngagement: 0,
        sentiment: 'neutral'
      };
    }

    const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
    const avgScore = totalScore / posts.length;
    const totalEngagement = posts.reduce((sum, post) => sum + post.numComments, 0);

    // Simple sentiment classification based on average score
    let sentiment = 'neutral';
    if (avgScore > 10) {
      sentiment = 'positive';
    } else if (avgScore < 0) {
      sentiment = 'negative';
    }

    return {
      avgScore: Math.round(avgScore * 10) / 10,
      totalEngagement,
      sentiment
    };
  }

  /**
   * Format posts for Claude analysis
   * @param {Array} posts - Array of posts
   * @returns {string} - Formatted text for Claude
   */
  formatForClaude(posts) {
    if (posts.length === 0) {
      return 'No Reddit posts found for this brand.';
    }

    const sentiment = this.extractSentiment(posts);

    let formatted = `REDDIT DATA (${posts.length} posts, avg score: ${sentiment.avgScore}, sentiment: ${sentiment.sentiment}):\n\n`;

    posts.forEach((post, index) => {
      formatted += `${index + 1}. [r/${post.subreddit}] ${post.title}\n`;
      formatted += `   Score: ${post.score} | Comments: ${post.numComments} | ${post.permalink}\n`;

      // Include snippet of body if it exists and is relevant
      if (post.body && post.body.length > 0) {
        const snippet = post.body.substring(0, 200).replace(/\n/g, ' ');
        formatted += `   Snippet: "${snippet}${post.body.length > 200 ? '...' : ''}"\n`;
      }

      formatted += `\n`;
    });

    return formatted;
  }

  /**
   * Parse time range to Reddit's time filter format
   * @param {string} timeRange - Human-readable time range
   * @returns {string} - Reddit time filter (hour, day, week, month, year, all)
   */
  parseTimeRange(timeRange) {
    const rangeLower = timeRange.toLowerCase();

    if (rangeLower.includes('24') || rangeLower.includes('hour')) {
      return 'day';
    } else if (rangeLower.includes('7') || rangeLower.includes('week')) {
      return 'week';
    } else if (rangeLower.includes('30') || rangeLower.includes('month')) {
      return 'month';
    } else if (rangeLower.includes('year')) {
      return 'year';
    } else {
      return 'week'; // Default to week
    }
  }
}

/**
 * Main export function for Reddit search
 * @param {string} brand - Brand name
 * @param {string} timeRange - Time range
 * @returns {Promise<Object>} - Reddit data and formatted text
 */
async function searchReddit(brand, timeRange = '7 days') {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT;

  if (!clientId || !clientSecret) {
    console.warn('⚠️ Reddit API credentials not configured, skipping Reddit search');
    return {
      posts: [],
      formattedText: 'Reddit data unavailable (API credentials not configured)',
      sentiment: { avgScore: 0, totalEngagement: 0, sentiment: 'neutral' }
    };
  }

  try {
    const service = new RedditService(clientId, clientSecret, userAgent);
    const posts = await service.searchReddit(brand, timeRange);
    const sentiment = service.extractSentiment(posts);
    const formattedText = service.formatForClaude(posts);

    return {
      posts,
      formattedText,
      sentiment
    };

  } catch (error) {
    console.error('❌ Reddit search failed:', error);
    return {
      posts: [],
      formattedText: `Reddit search error: ${error.message}`,
      sentiment: { avgScore: 0, totalEngagement: 0, sentiment: 'neutral' }
    };
  }
}

module.exports = { RedditService, searchReddit };
