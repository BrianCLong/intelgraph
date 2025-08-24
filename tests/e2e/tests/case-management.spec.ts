import { test, expect } from '@playwright/test';

test.describe('Case Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'analyst@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create new investigation case', async ({ page }) => {
    await page.click('[data-testid="create-case-button"]');
    
    // Fill case details
    await page.fill('[data-testid="case-title"]', 'Cybersecurity Incident Investigation');
    await page.fill('[data-testid="case-description"]', 'Investigation of potential data breach');
    await page.selectOption('[data-testid="case-priority"]', 'HIGH');
    await page.selectOption('[data-testid="case-type"]', 'CYBER_SECURITY');
    
    // Add initial entities
    await page.click('[data-testid="add-entity-button"]');
    await page.selectOption('[data-testid="entity-type"]', 'IP_ADDRESS');
    await page.fill('[data-testid="entity-value"]', '192.168.1.100');
    await page.click('[data-testid="save-entity"]');
    
    // Save case
    await page.click('[data-testid="save-case"]');
    
    // Verify case created
    await expect(page.locator('[data-testid="case-title-display"]')).toContainText('Cybersecurity Incident Investigation');
    await expect(page.locator('[data-testid="case-status"]')).toContainText('ACTIVE');
    await expect(page.locator('[data-testid="entity-list"]')).toContainText('192.168.1.100');
  });

  test('should assign case to team member', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    await page.click('[data-testid="assign-case-button"]');
    await page.selectOption('[data-testid="assignee-select"]', 'senior-analyst@example.com');
    await page.fill('[data-testid="assignment-note"]', 'Please review the network logs');
    await page.click('[data-testid="confirm-assignment"]');
    
    // Verify assignment
    await expect(page.locator('[data-testid="assigned-to"]')).toContainText('senior-analyst@example.com');
    
    // Verify audit trail
    await page.click('[data-testid="audit-trail-tab"]');
    await expect(page.locator('[data-testid="audit-entry"]').first()).toContainText('Case assigned');
  });

  test('should add collaborative comments', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Add comment with mention
    await page.fill('[data-testid="comment-input"]', 'Found suspicious activity @senior-analyst please review');
    await page.click('[data-testid="send-comment"]');
    
    // Verify comment appears
    await expect(page.locator('[data-testid="comment-thread"]')).toContainText('Found suspicious activity');
    
    // Reply to comment
    await page.click('[data-testid="reply-button"]');
    await page.fill('[data-testid="reply-input"]', 'Investigating further');
    await page.click('[data-testid="send-reply"]');
    
    // Verify threaded conversation
    await expect(page.locator('[data-testid="comment-replies"]')).toContainText('Investigating further');
  });

  test('should upload and analyze evidence files', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Upload file
    await page.click('[data-testid="upload-evidence-button"]');
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'network-logs.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('192.168.1.100 - - [01/Jan/2024:12:00:00] "GET /admin" 401')
    });
    
    await page.fill('[data-testid="evidence-description"]', 'Network access logs showing unauthorized attempts');
    await page.click('[data-testid="upload-file"]');
    
    // Verify file uploaded
    await expect(page.locator('[data-testid="evidence-list"]')).toContainText('network-logs.txt');
    
    // Check AI analysis
    await page.click('[data-testid="analyze-evidence"]');
    await expect(page.locator('[data-testid="ai-analysis"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="extracted-entities"]')).toContainText('192.168.1.100');
  });

  test('should track case timeline and milestones', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Add milestone
    await page.click('[data-testid="add-milestone-button"]');
    await page.fill('[data-testid="milestone-title"]', 'Initial Evidence Collection');
    await page.fill('[data-testid="milestone-description"]', 'Gathered network logs and system files');
    await page.click('[data-testid="save-milestone"]');
    
    // Verify milestone in timeline
    await expect(page.locator('[data-testid="timeline-milestone"]')).toContainText('Initial Evidence Collection');
    
    // Mark milestone complete
    await page.click('[data-testid="complete-milestone"]');
    await expect(page.locator('[data-testid="milestone-status"]')).toContainText('Completed');
    
    // Verify progress indicator
    const progress = await page.locator('[data-testid="case-progress"]').textContent();
    expect(parseInt(progress!)).toBeGreaterThan(0);
  });

  test('should generate investigation reports', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    // Generate preliminary report
    await page.click('[data-testid="generate-report-button"]');
    await page.selectOption('[data-testid="report-type"]', 'PRELIMINARY');
    await page.check('[data-testid="include-timeline"]');
    await page.check('[data-testid="include-entities"]');
    await page.check('[data-testid="include-evidence"]');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="generate-report"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/preliminary-report-.*\.pdf/);
  });

  test('should close case with resolution', async ({ page }) => {
    await page.goto('/case/test-case-1');
    
    await page.click('[data-testid="close-case-button"]');
    await page.selectOption('[data-testid="resolution-type"]', 'RESOLVED');
    await page.fill('[data-testid="resolution-summary"]', 'Security incident contained. No data breach confirmed.');
    await page.fill('[data-testid="lessons-learned"]', 'Improved monitoring needed for admin endpoints');
    
    // Add final report
    await page.setInputFiles('[data-testid="final-report-upload"]', {
      name: 'final-report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Final investigation report content')
    });
    
    await page.click('[data-testid="confirm-closure"]');
    
    // Verify case closed
    await expect(page.locator('[data-testid="case-status"]')).toContainText('CLOSED');
    await expect(page.locator('[data-testid="resolution-display"]')).toContainText('RESOLVED');
    
    // Verify immutable audit trail
    await page.click('[data-testid="audit-trail-tab"]');
    await expect(page.locator('[data-testid="case-closure-audit"]')).toBeVisible();
  });

  test('should handle case templates and workflows', async ({ page }) => {
    await page.click('[data-testid="create-case-button"]');
    
    // Use template
    await page.click('[data-testid="use-template-button"]');
    await page.selectOption('[data-testid="template-select"]', 'cybersecurity-incident');
    
    // Verify template loaded
    await expect(page.locator('[data-testid="case-title"]')).toHaveValue('Cybersecurity Incident Investigation');
    await expect(page.locator('[data-testid="workflow-steps"]')).toBeVisible();
    
    // Follow workflow
    await page.click('[data-testid="start-workflow"]');
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Initial Assessment');
    
    // Complete step
    await page.fill('[data-testid="step-notes"]', 'Completed initial triage');
    await page.click('[data-testid="complete-step"]');
    
    // Verify next step
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Evidence Collection');
  });
});