#!/usr/bin/env node

/**
 * CI Commenter Script for IntelGraph
 * Analyzes failing CI checks and posts helpful comments on PRs
 */

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ 
  auth: process.env.GITHUB_TOKEN 
});

const repo = { 
  owner: "BrianCLong", 
  repo: "intelgraph" 
};

const HELP_MESSAGES = {
  'build-test': {
    title: 'Build Failed',
    tips: [
      'Ensure all dependencies are installed: `npm ci`',
      'Check TypeScript compilation: `npm run typecheck`',
      'Verify workspace dependencies are properly linked',
      'Try clearing node_modules and reinstalling'
    ]
  },
  'build-and-push': {
    title: 'Docker Build Failed',
    tips: [
      'Check Dockerfile syntax and build context',
      'Ensure all required files are included in build context',
      'Verify base image compatibility',
      'Check for missing environment variables'
    ]
  },
  'zap-baseline': {
    title: 'Security Scan Failed',
    tips: [
      'Review ZAP security findings in the artifacts',
      'Update .zap/rules.tsv to handle false positives',
      'Ensure the application starts correctly for scanning',
      'Check for exposed sensitive endpoints'
    ]
  },
  'k6': {
    title: 'Performance Tests Failed',
    tips: [
      'Check if the application is running and accessible',
      'Verify performance test thresholds are realistic',
      'Ensure test data and endpoints are available',
      'Consider adding performance optimizations'
    ]
  },
  'analyze (javascript-typescript)': {
    title: 'CodeQL Analysis Failed',
    tips: [
      'Check for JavaScript/TypeScript syntax errors',
      'Ensure all dependencies are properly installed',
      'Review CodeQL security findings',
      'Fix any detected security vulnerabilities'
    ]
  },
  'analyze (python)': {
    title: 'Python CodeQL Analysis Failed',
    tips: [
      'Check Python syntax and import statements',
      'Ensure Python dependencies are installed',
      'Review Python security findings',
      'Verify Python version compatibility (3.11+)'
    ]
  },
  'test': {
    title: 'Unit Tests Failed',
    tips: [
      'Run tests locally: `npm run test:unit`',
      'Check for failing test cases and fix them',
      'Ensure test dependencies are properly mocked',
      'Verify test data and fixtures are available'
    ]
  },
  'validate': {
    title: 'Validation Failed',
    tips: [
      'Check Node.js version compatibility (20.13.1)',
      'Verify package.json and lockfile consistency',
      'Ensure all scripts referenced in CI exist',
      'Run validation locally: `npm run lint && npm run typecheck`'
    ]
  },
  'gitleaks': {
    title: 'Secret Scan Failed',
    tips: [
      '⚠️ **CRITICAL**: Secrets detected in code',
      'Review the GitLeaks report immediately',
      'Rotate any exposed secrets/tokens',
      'Use environment variables for sensitive data',
      'Never commit real API keys or passwords'
    ]
  }
};

function getFailureHelp(checkName) {
  // Find matching help message
  for (const [key, help] of Object.entries(HELP_MESSAGES)) {
    if (checkName.includes(key)) {
      return help;
    }
  }
  
  // Default help for unknown failures
  return {
    title: 'CI Check Failed',
    tips: [
      'Check the full logs in the GitHub Actions tab',
      'Ensure your branch is up to date with main',
      'Try running the equivalent command locally',
      'Ask for help in the team chat if needed'
    ]
  };
}

function formatComment(pr, failingChecks) {
  const lines = [
    `## 🚨 CI Failures for PR #${pr.number}`,
    '',
    `Hi @${pr.user.login}! Your PR has some failing CI checks that need attention:`,
    ''
  ];

  // Group failures by type
  const groupedFailures = {};
  for (const check of failingChecks) {
    const help = getFailureHelp(check.name);
    if (!groupedFailures[help.title]) {
      groupedFailures[help.title] = { help, checks: [] };
    }
    groupedFailures[help.title].checks.push(check);
  }

  // Add details for each failure type
  for (const [title, { help, checks }] of Object.entries(groupedFailures)) {
    lines.push(`### ${title}`);
    lines.push('');
    
    // List the specific failing checks
    for (const check of checks) {
      lines.push(`- **${check.name}** ([details](${check.details_url}))`);
    }
    lines.push('');
    
    // Add helpful tips
    lines.push('**Suggested fixes:**');
    for (const tip of help.tips) {
      lines.push(`- ${tip}`);
    }
    lines.push('');
  }

  // Add general guidance
  lines.push('---');
  lines.push('');
  lines.push('### 🔧 Quick Debug Steps');
  lines.push('');
  lines.push('1. **Rebase on latest main**: `git rebase origin/main`');
  lines.push('2. **Run CI locally**: `npm run ci:local`');
  lines.push('3. **Check specific areas**: Focus on the failing checks above');
  lines.push('4. **Re-push**: Force push your fixes to trigger new CI run');
  lines.push('');
  lines.push('### 📚 Resources');
  lines.push('');
  lines.push('- [CI/CD Documentation](https://github.com/BrianCLong/intelgraph/docs/ci-cd.md)');
  lines.push('- [Development Setup](https://github.com/BrianCLong/intelgraph/docs/development.md)');
  lines.push('- [Security Guidelines](https://github.com/BrianCLong/intelgraph/docs/security.md)');
  lines.push('');
  lines.push('---');
  lines.push('*This comment was automatically generated by the CI system. It will be updated when you push new commits.*');

  return lines.join('\n');
}

async function main() {
  try {
    console.log('🔍 Checking for PRs with failing CI...');
    
    // Get all open PRs updated in the last 7 days
    const { data: prs } = await octokit.pulls.list({ 
      ...repo, 
      state: "open", 
      per_page: 100 
    });

    const recentPrs = prs.filter(pr => {
      const updatedAt = new Date(pr.updated_at);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return updatedAt > weekAgo;
    });

    console.log(`📋 Found ${recentPrs.length} recently updated PRs`);

    let processedCount = 0;
    let commentedCount = 0;

    for (const pr of recentPrs) {
      try {
        console.log(`\n🔍 Checking PR #${pr.number}: ${pr.title}`);
        
        // Get check runs for this PR
        const { data: checkRuns } = await octokit.checks.listForRef({ 
          ...repo, 
          ref: pr.head.sha 
        });

        // Find failing checks
        const failingChecks = checkRuns.check_runs.filter(check => 
          check.conclusion === "failure" || check.conclusion === "timed_out"
        );

        if (failingChecks.length === 0) {
          console.log(`✅ PR #${pr.number} has no failing checks`);
          processedCount++;
          continue;
        }

        console.log(`❌ PR #${pr.number} has ${failingChecks.length} failing checks`);

        // Check if we already commented on this PR recently
        const { data: comments } = await octokit.issues.listComments({
          ...repo,
          issue_number: pr.number,
          per_page: 10
        });

        const botComments = comments.filter(comment => 
          comment.user.type === 'Bot' || 
          comment.body.includes('This comment was automatically generated by the CI system')
        );

        const recentBotComment = botComments.find(comment => {
          const commentAge = Date.now() - new Date(comment.created_at).getTime();
          return commentAge < 60 * 60 * 1000; // Less than 1 hour old
        });

        if (recentBotComment) {
          console.log(`⏭️ Skipping PR #${pr.number} - already commented recently`);
          processedCount++;
          continue;
        }

        // Generate helpful comment
        const commentBody = formatComment(pr, failingChecks);

        // Post the comment
        await octokit.issues.createComment({
          ...repo,
          issue_number: pr.number,
          body: commentBody
        });

        // Add needs-attention label
        await octokit.issues.addLabels({
          ...repo,
          issue_number: pr.number,
          labels: ["needs-attention", "ci-failing"]
        });

        console.log(`💬 Posted helpful comment on PR #${pr.number}`);
        commentedCount++;
        processedCount++;

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing PR #${pr.number}:`, error.message);
        processedCount++;
      }
    }

    console.log(`\n🎉 Completed processing ${processedCount} PRs`);
    console.log(`💬 Posted comments on ${commentedCount} PRs with failing CI`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { main, formatComment, getFailureHelp };