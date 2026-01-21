const axios = require('axios');

class SerperSearchService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Serper API key is required');
    }

    this.apiKey = apiKey;
    this.endpoint = 'https://google.serper.dev/search';
  }

  /**
   * Search LinkedIn for brand mentions
   * @param {string} brand - Brand name
   * @returns {Promise<Array>} - Array of LinkedIn results
   */
  async searchLinkedIn(brand) {
    try {
      console.log(`🔍 Searching LinkedIn for: ${brand}`);

      const queries = [
        `"${brand}" site:linkedin.com/posts`,
        `"${brand} feedback" site:linkedin.com`,
        `"${brand} review" site:linkedin.com`
      ];

      const results = [];

      for (const query of queries) {
        const searchResults = await this.executeSerperSearch(query, 5);
        results.push(...searchResults);
      }

      // Deduplicate by URL
      const unique = this.deduplicateResults(results);

      console.log(`✅ Found ${unique.length} LinkedIn results`);
      return unique;

    } catch (error) {
      console.error('❌ LinkedIn search error:', error.message);
      return [];
    }
  }

  /**
   * Search X/Twitter for brand mentions
   * @param {string} brand - Brand name
   * @returns {Promise<Array>} - Array of Twitter results
   */
  async searchTwitter(brand) {
    try {
      console.log(`🔍 Searching X/Twitter for: ${brand}`);

      const queries = [
        `"${brand}" (site:twitter.com OR site:x.com)`,
        `"${brand} feedback" site:twitter.com`,
        `"${brand} complaint" site:x.com`
      ];

      const results = [];

      for (const query of queries) {
        const searchResults = await this.executeSerperSearch(query, 5);
        results.push(...searchResults);
      }

      const unique = this.deduplicateResults(results);

      console.log(`✅ Found ${unique.length} Twitter/X results`);
      return unique;

    } catch (error) {
      console.error('❌ Twitter search error:', error.message);
      return [];
    }
  }

  /**
   * Search review sites (G2, Capterra, TrustRadius)
   * @param {string} brand - Brand name
   * @returns {Promise<Array>} - Array of review site results
   */
  async searchReviewSites(brand) {
    try {
      console.log(`🔍 Searching review sites for: ${brand}`);

      const queries = [
        `"${brand}" site:g2.com`,
        `"${brand}" site:capterra.com`,
        `"${brand} review" site:trustradius.com`
      ];

      const results = [];

      for (const query of queries) {
        const searchResults = await this.executeSerperSearch(query, 5);
        results.push(...searchResults);
      }

      const unique = this.deduplicateResults(results);

      console.log(`✅ Found ${unique.length} review site results`);
      return unique;

    } catch (error) {
      console.error('❌ Review sites search error:', error.message);
      return [];
    }
  }

  /**
   * Search blogs and forums
   * @param {string} brand - Brand name
   * @returns {Promise<Array>} - Array of blog results
   */
  async searchBlogs(brand) {
    try {
      console.log(`🔍 Searching blogs for: ${brand}`);

      const queries = [
        `"${brand}" site:medium.com`,
        `"${brand}" site:dev.to`,
        `"${brand}" site:news.ycombinator.com`
      ];

      const results = [];

      for (const query of queries) {
        const searchResults = await this.executeSerperSearch(query, 5);
        results.push(...searchResults);
      }

      const unique = this.deduplicateResults(results);

      console.log(`✅ Found ${unique.length} blog results`);
      return unique;

    } catch (error) {
      console.error('❌ Blog search error:', error.message);
      return [];
    }
  }

  /**
   * Execute a Serper API search
   * @param {string} query - Search query
   * @param {number} num - Number of results to return (max 10 per request)
   * @returns {Promise<Array>} - Array of search results
   */
  async executeSerperSearch(query, num = 10) {
    try {
      const config = {
        method: 'post',
        url: this.endpoint,
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: {
          q: query,
          num: Math.min(num, 10) // Serper allows max 10 per request
        }
      };

      const response = await axios(config);

      if (!response.data || !response.data.organic) {
        return [];
      }

      return response.data.organic.map(item => ({
        name: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
        datePublished: item.date || null,
        displayUrl: item.link ? new URL(item.link).hostname : ''
      }));

    } catch (error) {
      // Handle quota errors gracefully
      if (error.response) {
        if (error.response.status === 429) {
          console.error(`⚠️ Serper Search quota exceeded`);
        } else if (error.response.status === 401 || error.response.status === 403) {
          console.error(`⚠️ Serper Search API access denied - check API key`);
        } else {
          console.error(`❌ Serper search failed for query "${query}": ${error.response.status} ${error.response.statusText}`);
        }
      } else {
        console.error(`❌ Serper search failed for query "${query}":`, error.message);
      }
      return [];
    }
  }

  /**
   * Deduplicate search results by URL
   * @param {Array} results - Array of results
   * @returns {Array} - Deduplicated results
   */
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.url)) {
        return false;
      }
      seen.add(result.url);
      return true;
    });
  }

  /**
   * Format all search results for Claude analysis
   * @param {Object} allResults - Object containing results by platform
   * @returns {string} - Formatted text for Claude
   */
  formatForClaude(allResults) {
    let formatted = '';

    // LinkedIn results
    if (allResults.linkedin && allResults.linkedin.length > 0) {
      formatted += `\nLINKEDIN DATA (${allResults.linkedin.length} results):\n`;
      allResults.linkedin.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    // Twitter/X results
    if (allResults.twitter && allResults.twitter.length > 0) {
      formatted += `\nTWITTER/X DATA (${allResults.twitter.length} results):\n`;
      allResults.twitter.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    // Review sites results
    if (allResults.reviews && allResults.reviews.length > 0) {
      formatted += `\nREVIEW SITES DATA (${allResults.reviews.length} results):\n`;
      allResults.reviews.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    // Blog results
    if (allResults.blogs && allResults.blogs.length > 0) {
      formatted += `\nBLOGS & FORUMS DATA (${allResults.blogs.length} results):\n`;
      allResults.blogs.forEach((result, index) => {
        formatted += `${index + 1}. ${result.name}\n`;
        formatted += `   ${result.url}\n`;
        formatted += `   Snippet: "${result.snippet}"\n\n`;
      });
    }

    if (formatted === '') {
      return 'No web search results found.';
    }

    return formatted;
  }
}

/**
 * Main export function for web search across all platforms using Serper
 * @param {string} brand - Brand name
 * @param {string} platforms - Platforms to search (comma-separated or 'all')
 * @returns {Promise<Object>} - Search results by platform
 */
async function searchSerper(brand, platforms = 'all') {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ Serper Search API key not configured, skipping web search');
    return {
      linkedin: [],
      twitter: [],
      reviews: [],
      blogs: [],
      formattedText: 'Web search data unavailable (Serper API key not configured)',
      totalResults: 0
    };
  }

  try {
    const service = new SerperSearchService(apiKey);

    // Determine which platforms to search
    const shouldSearch = {
      linkedin: platforms === 'all' || platforms.toLowerCase().includes('linkedin'),
      twitter: platforms === 'all' || platforms.toLowerCase().includes('twitter') || platforms.toLowerCase().includes('x'),
      reviews: platforms === 'all' || platforms.toLowerCase().includes('g2') || platforms.toLowerCase().includes('capterra'),
      blogs: platforms === 'all' || platforms.toLowerCase().includes('blog') || platforms.toLowerCase().includes('medium')
    };

    // Execute searches in parallel
    const [linkedin, twitter, reviews, blogs] = await Promise.all([
      shouldSearch.linkedin ? service.searchLinkedIn(brand) : Promise.resolve([]),
      shouldSearch.twitter ? service.searchTwitter(brand) : Promise.resolve([]),
      shouldSearch.reviews ? service.searchReviewSites(brand) : Promise.resolve([]),
      shouldSearch.blogs ? service.searchBlogs(brand) : Promise.resolve([])
    ]);

    const results = { linkedin, twitter, reviews, blogs };
    const totalResults = linkedin.length + twitter.length + reviews.length + blogs.length;

    console.log(`✅ Total web search results: ${totalResults}`);

    return {
      ...results,
      formattedText: service.formatForClaude(results),
      totalResults
    };

  } catch (error) {
    console.error('❌ Web search failed:', error);
    return {
      linkedin: [],
      twitter: [],
      reviews: [],
      blogs: [],
      formattedText: `Web search error: ${error.message}`,
      totalResults: 0
    };
  }
}

// Aliases for backward compatibility
const searchGoogle = searchSerper;
const searchBing = searchSerper;

module.exports = { SerperSearchService, searchSerper, searchGoogle, searchBing };
