require('dotenv').config();
const { searchGoogle } = require('./search-service');

async function testGoogleSearch() {
  console.log('🧪 Testing Google Custom Search API Integration\n');

  const testBrand = 'Slack';

  console.log(`Testing search for brand: "${testBrand}"\n`);

  try {
    const results = await searchGoogle(testBrand, 'all');

    console.log('\n📊 RESULTS SUMMARY:');
    console.log(`   LinkedIn results: ${results.linkedin.length}`);
    console.log(`   Twitter/X results: ${results.twitter.length}`);
    console.log(`   Review sites results: ${results.reviews.length}`);
    console.log(`   Blog results: ${results.blogs.length}`);
    console.log(`   Total results: ${results.totalResults}`);

    console.log('\n📝 SAMPLE RESULTS:\n');

    if (results.linkedin.length > 0) {
      console.log('LinkedIn (first result):');
      console.log(`   Title: ${results.linkedin[0].name}`);
      console.log(`   URL: ${results.linkedin[0].url}`);
      console.log(`   Snippet: ${results.linkedin[0].snippet.substring(0, 100)}...\n`);
    }

    if (results.twitter.length > 0) {
      console.log('Twitter/X (first result):');
      console.log(`   Title: ${results.twitter[0].name}`);
      console.log(`   URL: ${results.twitter[0].url}`);
      console.log(`   Snippet: ${results.twitter[0].snippet.substring(0, 100)}...\n`);
    }

    if (results.reviews.length > 0) {
      console.log('Review Sites (first result):');
      console.log(`   Title: ${results.reviews[0].name}`);
      console.log(`   URL: ${results.reviews[0].url}`);
      console.log(`   Snippet: ${results.reviews[0].snippet.substring(0, 100)}...\n`);
    }

    console.log('✅ Google Search API integration is working!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testGoogleSearch();
