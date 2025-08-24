import { Octokit } from '@octokit/rest'; // Changed from require
const ok = new Octokit({ auth: process.env.GITHUB_TOKEN });
const repo = { owner: 'BrianCLong', repo: 'intelgraph' };

(async () => {
  const prs = await ok.paginate(ok.pulls.list, { ...repo, state: 'open', per_page: 100 });
  for (const pr of prs) {
    // Get last two ci:smoke runs for this PR by head SHA
    const runs = await ok.paginate(ok.actions.listWorkflowRunsForRepo, {
      ...repo,
      per_page: 50,
      event: 'pull_request',
      status: 'completed',
    });
    const headRuns = runs
      .filter((r) => r.name === 'ci:smoke' && r.head_sha === pr.head.sha)
      .slice(0, 2);
    if (headRuns.length < 2) continue;
    const failedTwice = headRuns.every((r) => r.conclusion === 'failure');
    if (!failedTwice) continue;

    // Label as needs-fix (idempotent)
    const labels = pr.labels.map((l) => l.name);
    if (!labels.includes('needs-fix')) {
      await ok.issues.addLabels({ ...repo, issue_number: pr.number, labels: ['needs-fix'] });
      await ok.issues.createComment({
        ...repo,
        issue_number: pr.number,
        body: 'ci:smoke failed twice in a row. Marking as **needs-fix**; merge train will skip until green.',
      });
      // console.log(`Labeled PR #${pr.number} as needs-fix`); // Removed console.log
    }
  }
})();
