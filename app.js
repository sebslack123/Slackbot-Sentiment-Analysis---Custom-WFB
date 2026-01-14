require('dotenv').config();

const { App } = require('@slack/bolt');
const { analyzeSocialListening } = require('./claude-service');

console.log('🎯 SOCIAL LISTENING REPORT - SLACK WORKFLOW CUSTOM STEP');
console.log('📋 Using functions.completeSuccess method with output parameters');

// Initialize app with Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: 'DEBUG'
});

console.log('✅ Slack Bolt app initialized with Social Listening function');

// PRIMARY IMPLEMENTATION: Using function_executed event
app.event('function_executed', async ({ event, client }) => {
  console.log('🚀🚀🚀 FUNCTION_EXECUTED EVENT RECEIVED! 🚀🚀🚀');
  console.log('📥 Event details:', JSON.stringify(event, null, 2));

  // Check if this is our social listening function
  if (event.function.callback_id === 'social_listening_report') {
    console.log('🎯 Social Listening Report function triggered!');

    try {
      // Extract inputs from the event
      const inputs = event.inputs || {};
      const { brand_or_product, competitors, time_range, platforms } = inputs;

      console.log('📥 Function inputs:', { brand_or_product, competitors, time_range, platforms });

      // Validate required parameter
      if (!brand_or_product) {
        console.log('❌ Missing required brand_or_product parameter');
        await client.functions.completeError({
          function_execution_id: event.function.function_execution_id,
          error: 'Brand/Product Name parameter is required but was not provided'
        });
        return;
      }

      console.log('🔍 Performing social listening analysis with Claude AI...');
      console.log('🌐 Analyzing sentiment across multiple platforms...');

      // Call Claude AI service for social listening analysis
      const analysis = await analyzeSocialListening(
        brand_or_product,
        competitors || '',
        time_range || '7 days',
        platforms || 'all'
      );

      console.log('✅ Claude AI analysis completed');
      console.log('📊 Analysis results:', {
        sentiment_length: analysis.sentimentSummary?.length || 0,
        positive_length: analysis.positiveHighlights?.length || 0,
        concerns_length: analysis.negativeConcerns?.length || 0,
        has_critical_issues: analysis.hasCriticalIssues
      });

      // Format outputs for Slack workflow variables
      const outputs = {
        sentiment_summary: analysis.sentimentSummary
          ? `📊 ${analysis.sentimentSummary}`
          : '📊 Unable to determine sentiment distribution.',

        positive_highlights: analysis.positiveHighlights
          ? `✅ ${analysis.positiveHighlights}`
          : '✅ No significant positive highlights identified.',

        negative_concerns: analysis.negativeConcerns
          ? `⚠️ ${analysis.negativeConcerns}`
          : '⚠️ No critical concerns identified at this time.',

        trending_topics: analysis.trendingTopics
          ? `🔥 ${analysis.trendingTopics}`
          : '🔥 No trending topics detected.',

        competitive_insights: analysis.competitiveInsights
          ? `🎯 ${analysis.competitiveInsights}`
          : '🎯 No competitive insights available.',

        full_report: analysis.fullReport || `# Social Listening Report

**Brand/Product:** ${brand_or_product}
**Competitors Tracked:** ${competitors || 'None specified'}
**Time Range:** ${time_range || '7 days'}
**Platforms:** ${platforms || 'All platforms'}
**Generated:** ${new Date().toLocaleString()}
**Report ID:** SL-${Date.now()}

## Analysis Status
Social listening analysis completed using Claude AI with web search capabilities.

## Summary
${analysis.sentimentSummary ? '📊 **SENTIMENT ANALYZED**' : '📊 **SENTIMENT DATA UNAVAILABLE**'}

${analysis.positiveHighlights ? '✅ **POSITIVE FEEDBACK FOUND**' : '✅ **NO POSITIVE HIGHLIGHTS**'}

${analysis.negativeConcerns ? '⚠️ **CONCERNS IDENTIFIED**' : '⚠️ **NO CRITICAL CONCERNS**'}

${analysis.trendingTopics ? '🔥 **TRENDING TOPICS DETECTED**' : '🔥 **NO TRENDING TOPICS**'}

${analysis.competitiveInsights ? '🎯 **COMPETITIVE INSIGHTS AVAILABLE**' : '🎯 **NO COMPETITIVE DATA**'}

---
*Powered by Claude AI Social Listening System*
*Real-time sentiment and brand monitoring*`,

        has_critical_issues: analysis.hasCriticalIssues ? "true" : "false",
        report_timestamp: analysis.timestamp || new Date().toISOString()
      };

      console.log('📤 CALLING functions.completeSuccess WITH OUTPUTS:');
      console.log('📤 Function execution ID:', event.function.function_execution_id);
      console.log('📤 Output parameters being sent:');
      Object.keys(outputs).forEach(key => {
        console.log(`   - ${key}: ${outputs[key].length} characters`);
      });

      // CRITICAL: Use functions.completeSuccess to complete the function and create variables
      await client.functions.completeSuccess({
        function_execution_id: event.function.function_execution_id,
        outputs: outputs
      });

      console.log('✅✅✅ FUNCTION COMPLETED SUCCESSFULLY! ✅✅✅');
      console.log('🎯 OUTPUT PARAMETERS NOW AVAILABLE AS WORKFLOW VARIABLES:');
      console.log('   ✅ sentiment_summary → {{Social Listening Report > Sentiment Breakdown}}');
      console.log('   ✅ positive_highlights → {{Social Listening Report > Positive Feedback}}');
      console.log('   ✅ negative_concerns → {{Social Listening Report > Negative Feedback}}');
      console.log('   ✅ trending_topics → {{Social Listening Report > Trending Topics}}');
      console.log('   ✅ competitive_insights → {{Social Listening Report > Competitive Mentions}}');
      console.log('   ✅ full_report → {{Social Listening Report > Complete Report}}');
      console.log('   ✅ has_critical_issues → {{Social Listening Report > Has Critical Issues}}');
      console.log('   ✅ report_timestamp → {{Social Listening Report > Report Generated At}}');
      console.log('🔥 VARIABLES ARE NOW READY FOR USE IN SUBSEQUENT WORKFLOW STEPS!');

    } catch (error) {
      console.error('❌ Function execution error:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      try {
        await client.functions.completeError({
          function_execution_id: event.function.function_execution_id,
          error: `Social listening analysis failed: ${error.message}`
        });
        console.log('💥 Error reported via functions.completeError');
      } catch (completeErrorError) {
        console.error('💥💥 Failed to complete error:', completeErrorError);
      }
    }
  } else {
    console.log('🔍 Different function executed:', event.function.callback_id);
  }
});

// BACKUP: Direct function handler (belt and suspenders approach)
app.function('social_listening_report', async ({ inputs, complete, fail }) => {
  console.log('🔄 BACKUP: Direct function handler triggered');
  console.log('📥 Direct inputs:', JSON.stringify(inputs, null, 2));

  try {
    const { brand_or_product, competitors, time_range, platforms } = inputs;

    if (!brand_or_product) {
      await fail({ error: 'Brand/Product Name parameter is required' });
      return;
    }

    console.log('🔍 BACKUP: Performing social listening analysis with Claude AI...');

    // Call Claude AI service for analysis
    const analysis = await analyzeSocialListening(
      brand_or_product,
      competitors || '',
      time_range || '7 days',
      platforms || 'all'
    );

    console.log('✅ BACKUP: Claude AI analysis completed');

    const outputs = {
      sentiment_summary: analysis.sentimentSummary
        ? `📊 ${analysis.sentimentSummary}`
        : '📊 Unable to determine sentiment distribution.',

      positive_highlights: analysis.positiveHighlights
        ? `✅ ${analysis.positiveHighlights}`
        : '✅ No significant positive highlights identified.',

      negative_concerns: analysis.negativeConcerns
        ? `⚠️ ${analysis.negativeConcerns}`
        : '⚠️ No critical concerns identified.',

      trending_topics: analysis.trendingTopics
        ? `🔥 ${analysis.trendingTopics}`
        : '🔥 No trending topics detected.',

      competitive_insights: analysis.competitiveInsights
        ? `🎯 ${analysis.competitiveInsights}`
        : '🎯 No competitive insights available.',

      full_report: analysis.fullReport || `# Social Listening Report\n\n**Brand:** ${brand_or_product}\n**Analysis:** ${new Date().toISOString()}\n\nSocial listening analysis completed.`,

      has_critical_issues: analysis.hasCriticalIssues ? "true" : "false",
      report_timestamp: analysis.timestamp || new Date().toISOString()
    };

    console.log('📤 BACKUP: Calling complete() with analysis outputs');
    await complete({ outputs });
    console.log('✅ BACKUP: Function completed with social listening analysis');

  } catch (error) {
    console.error('❌ BACKUP: Analysis error:', error);

    // Provide fallback analysis on error
    const fallbackOutputs = {
      sentiment_summary: `📊 Analysis Error: Unable to complete sentiment analysis. Error: ${error.message}`,
      positive_highlights: '✅ Unable to retrieve positive feedback due to analysis error.',
      negative_concerns: `⚠️ Critical: Analysis error occurred - ${error.message}`,
      trending_topics: '🔥 Unable to identify trending topics due to analysis error.',
      competitive_insights: '🎯 Unable to retrieve competitive insights due to analysis error.',
      full_report: `# Social Listening Analysis Error\n\n**Brand:** ${brand_or_product}\n**Error:** ${error.message}\n**Time:** ${new Date().toISOString()}\n\nPlease check API credentials and try again.`,
      has_critical_issues: "true",
      report_timestamp: new Date().toISOString()
    };

    await complete({ outputs: fallbackOutputs });
  }
});

// Test connectivity
app.message('listening', async ({ say }) => {
  console.log('📨 Social listening test message received');
  await say('✅ Social Listening Report app is running! Ready to analyze brand sentiment.');
});

// Log all events for debugging
app.event(/.*/, async ({ event }) => {
  console.log(`📡 EVENT: ${event.type}`, event);
});

// Global error handler
app.error(async (error) => {
  console.error('❌ Global app error:', error);
});

// Start the app
(async () => {
  try {
    await app.start();

    console.log('⚡️ SOCIAL LISTENING REPORT APP IS RUNNING!');
    console.log('🎯 Listening for function_executed events');
    console.log('📋 Will use functions.completeSuccess to create variables');
    console.log('🔥 Function "social_listening_report" ready for workflow execution!');
    console.log('');
    console.log('💡 Expected workflow variables after execution:');
    console.log('   • sentiment_summary (Sentiment Breakdown)');
    console.log('   • positive_highlights (Positive Feedback)');
    console.log('   • negative_concerns (Negative Feedback)');
    console.log('   • trending_topics (Trending Topics)');
    console.log('   • competitive_insights (Competitive Mentions)');
    console.log('   • full_report (Complete Report)');
    console.log('   • has_critical_issues (Has Critical Issues)');
    console.log('   • report_timestamp (Report Generated At)');

  } catch (error) {
    console.error('❌ Failed to start social listening app:', error);
    process.exit(1);
  }
})();
