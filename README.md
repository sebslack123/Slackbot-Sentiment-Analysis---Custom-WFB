# Social Listening Report - Slack Workflow Custom Step

Automated social listening and brand sentiment analysis using Claude AI with web search capabilities. This custom Slack Workflow Builder step monitors brand mentions across multiple platforms and delivers structured reports directly in Slack.

## Features

- **Multi-Platform Monitoring**: Analyzes mentions across LinkedIn, X/Twitter, Reddit, review sites (G2, Capterra, TrustRadius), blogs, and forums
- **Sentiment Analysis**: Calculates distribution of positive, neutral, and negative sentiment with volume metrics
- **Trending Topics**: Identifies most discussed themes and emerging patterns
- **Competitive Insights**: Compares brand positioning vs competitors
- **Actionable Recommendations**: Provides prioritized action items (immediate/short-term/long-term)
- **Conditional Workflow Logic**: Includes `has_critical_issues` flag for automated alerts
- **Slack Workflow Integration**: All outputs available as workflow variables for downstream steps

## Architecture

- **Slack Bolt Framework** with Socket Mode for local development
- **Claude AI (Sonnet 4)** for intelligent analysis and synthesis
- **Structured Output Parameters** accessible as Slack workflow variables
- **Dual-Handler Pattern** for robust function execution

## Prerequisites

- Node.js (v14 or higher)
- Slack Workspace with admin permissions
- Anthropic API key
- Slack App configured with:
  - Bot Token Scopes: `chat:write`, `chat:write.public`, `channels:read`
  - Socket Mode enabled
  - App-level token created

## Installation

### 1. Clone and Install Dependencies

```bash
cd social-listening-slack-app
npm install
```

### 2. Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From an app manifest"
3. Select your workspace
4. Copy the contents of `manifest.json` and paste it
5. Click "Create"

### 3. Configure Tokens

**Get Bot Token:**
1. Navigate to **OAuth & Permissions**
2. Click "Install to Workspace"
3. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

**Get App Token:**
1. Navigate to **Basic Information**
2. Scroll to "App-Level Tokens"
3. Click "Generate Token and Scopes"
4. Add scope: `connections:write`
5. Copy the token (starts with `xapp-`)

**Get Anthropic API Key:**
1. Go to https://console.anthropic.com/settings/keys
2. Create new API key
3. Copy the key (starts with `sk-ant-`)

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your tokens:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
NODE_ENV=development
PORT=3000
```

### 5. Start the Application

```bash
npm start
```

You should see:
```
⚡️ SOCIAL LISTENING REPORT APP IS RUNNING!
🎯 Listening for function_executed events
🔥 Function "social_listening_report" ready for workflow execution!
```

## Usage in Slack Workflows

### Creating a Workflow

1. In Slack, click on your workspace name → **Tools** → **Workflow Builder**
2. Click **Create** → **Start from scratch**
3. Add a trigger (Schedule, Webhook, or Manual)

### Adding the Social Listening Step

1. Click **Add Step**
2. Find **"Social Listening Report"** in the custom steps section
3. Configure inputs:
   - **Brand/Product Name** (required): e.g., "Slackbot"
   - **Competitors** (optional): e.g., "ChatGPT, Microsoft Copilot"
   - **Time Range** (optional): e.g., "7 days" (default), "24 hours", "30 days"
   - **Platforms to Monitor** (optional): e.g., "LinkedIn, Reddit, Twitter"

### Using Output Variables

After the Social Listening step, outputs are available as workflow variables:

```
{{ Social Listening Report > Sentiment Breakdown }}
{{ Social Listening Report > Positive Feedback }}
{{ Social Listening Report > Negative Feedback }}
{{ Social Listening Report > Trending Topics }}
{{ Social Listening Report > Competitive Mentions }}
{{ Social Listening Report > Action Items }}
{{ Social Listening Report > Complete Report }}
{{ Social Listening Report > Has Critical Issues }}
{{ Social Listening Report > Report Generated At }}
```

## Example Workflows

### 1. Weekly Product Team Report

```
1. Trigger: Schedule (Every Monday at 9 AM)
2. Social Listening Report
   - Brand/Product: "Slackbot"
   - Competitors: "ChatGPT, Microsoft Copilot"
   - Time Range: "7 days"
3. Send a message to #product-feedback
   - Message: {{ Social Listening Report > Complete Report }}
```

### 2. Critical Issue Alert

```
1. Trigger: Schedule (Daily at 8 AM)
2. Social Listening Report
   - Brand/Product: "Your Product"
   - Time Range: "24 hours"
3. Add a condition:
   - If {{ Social Listening Report > Has Critical Issues }} equals "true"
4. Send a message to #urgent-alerts
   - Message: 🚨 Critical Issues Detected!
     {{ Social Listening Report > Negative Feedback }}
```

### 3. Competitive Intelligence Dashboard

```
1. Trigger: Schedule (Weekly on Friday)
2. Social Listening Report
   - Brand/Product: "Your Product"
   - Competitors: "Competitor A, Competitor B"
   - Platforms: "LinkedIn, Reddit, G2"
3. Send multiple messages:
   - #marketing: {{ Social Listening Report > Sentiment Breakdown }}
   - #product: {{ Social Listening Report > Trending Topics }}
   - #leadership: {{ Social Listening Report > Competitive Mentions }}
```

## Output Format

### Sentiment Breakdown
```markdown
📊 Based on analysis of 247 mentions over the last 7 days:
- 58% positive (143 mentions)
- 27% neutral (67 mentions)
- 15% negative (37 mentions)

Overall sentiment: POSITIVE with stable trend.
```

### Positive Highlights
```markdown
✅ 1. **Ease of Use & Onboarding** (52 mentions)
   - "Slackbot onboarding is the smoothest I've experienced" - Reddit r/SaaS
   - Consistently praised for intuitive interface
   - Source: reddit.com/r/SaaS/comments/xyz123
```

### Critical Concerns
```markdown
⚠️ 1. **CRITICAL - Pricing Increase Backlash** (18 mentions)
   - Recent 30% price hike causing churn discussions
   - "Considering alternatives after price increase" - G2 review
   - Severity: HIGH | Frequency: INCREASING
```

### Trending Topics
```markdown
🔥 1. **Pricing Controversy** - 47 discussions
   - Dominated conversations this week
   - Sentiment shift from positive to mixed
```

### Competitive Insights
```markdown
🎯 CompetitorX is gaining traction in price-sensitive segments:
- "Switched from [Brand] to CompetitorX, saved 40%" - 7 mentions
- CompetitorX positioning as "affordable alternative"
```

### Actionable Insights
```markdown
💡 **IMMEDIATE ACTIONS:**
1. Address pricing concerns publicly - create transparent FAQ
2. Accelerate mobile app bug fixes

**SHORT-TERM (1-2 weeks):**
3. Launch dark mode feature to satisfy top request

**LONG-TERM (1-3 months):**
4. Competitive pricing analysis and tier adjustments
```

## Troubleshooting

### App Not Starting
- Verify all environment variables are set correctly
- Check that Socket Mode is enabled in Slack app settings
- Ensure App-Level Token has `connections:write` scope

### Function Not Appearing in Workflow Builder
- Confirm the app is installed in your workspace
- Check that `function_runtime: "remote"` is set in manifest
- Reinstall the app after manifest changes

### Claude API Errors
- Verify `ANTHROPIC_API_KEY` is correct
- Check API key permissions in Anthropic console
- Ensure you have sufficient API credits

### No Results Returned
- Check console logs for parsing errors
- Verify the brand name doesn't have special characters
- Try increasing time range (e.g., from "7 days" to "30 days")

## Development

### Running in Development Mode
```bash
npm run dev
```

### Testing the Function
Send a test message in Slack:
```
listening
```

Response should be:
```
✅ Social Listening Report app is running!
```

### Viewing Logs
All function executions are logged to console with detailed information:
- Input parameters received
- Claude API calls and responses
- Parsing results
- Output parameters sent to Slack

## API Rate Limits

- **Claude AI**: Check your plan limits at https://console.anthropic.com/
- **Slack API**: Standard rate limits apply (https://api.slack.com/docs/rate-limits)

## Cost Considerations

Each social listening analysis:
- Uses ~4000 tokens (Claude Sonnet 4)
- Typical cost: $0.01-0.02 per analysis
- Daily scheduled workflow (30 days): ~$0.30-0.60/month
- Weekly scheduled workflow: ~$0.08-0.16/month

## Security Best Practices

- Never commit `.env` file to version control
- Rotate API keys regularly
- Use environment-specific tokens for dev/prod
- Restrict bot token scopes to minimum required
- Enable Slack app permission reviews

## Comparison with Competitive Intelligence Scan

| Feature | Competitive Intelligence | Social Listening |
|---------|-------------------------|------------------|
| **Focus** | Business moves, strategy | Customer sentiment, feedback |
| **Sources** | News, patents, jobs | Social media, reviews, forums |
| **Outputs** | 3 categories (Urgent/FYI/Opportunity) | 6 categories (Sentiment/Positive/Concerns/Trending/Competitive/Insights) |
| **Frequency** | Weekly/Monthly | Daily/Weekly |
| **Use Case** | Strategic planning | Product/marketing decisions |

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs for error details
3. Verify API credentials and permissions
4. Check Slack API documentation: https://api.slack.com/

## License

MIT

## Credits

Built with:
- [Slack Bolt Framework](https://slack.dev/bolt-js/)
- [Anthropic Claude AI](https://www.anthropic.com/)
- [Node.js](https://nodejs.org/)
