/**
 * Global Teardown for E2E Tests
 * 
 * Cleans up resources and generates test reports.
 */

import { test as teardown } from '@playwright/test';
import fs from 'fs';
import path from 'path';

teardown('cleanup test environment', async ({ page }) => {
  console.log('Cleaning up test environment...');
  
  // Clear test-specific localStorage
  await page.evaluate(() => {
    const testKeys = [
      'e2e-test-mode',
      'disable-analytics',
      'disable-animations',
      'mock-api-enabled'
    ];
    
    testKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  });

  // Clear any test cookies
  const context = page.context();
  await context.clearCookies();
  
  console.log('Test environment cleanup completed');
});

teardown('generate performance report', async () => {
  // Generate a simple performance summary if test results exist
  const resultsPath = path.join(process.cwd(), 'test-results');
  
  if (fs.existsSync(resultsPath)) {
    try {
      const jsonResultPath = path.join(resultsPath, 'e2e-results.json');
      
      if (fs.existsSync(jsonResultPath)) {
        const results = JSON.parse(fs.readFileSync(jsonResultPath, 'utf8'));
        
        const summary = {
          totalTests: results.suites?.reduce((acc: number, suite: any) => 
            acc + (suite.specs?.length || 0), 0) || 0,
          totalDuration: results.stats?.duration || 0,
          passed: results.stats?.expected || 0,
          failed: results.stats?.unexpected || 0,
          skipped: results.stats?.skipped || 0,
          generatedAt: new Date().toISOString()
        };
        
        // Write summary
        fs.writeFileSync(
          path.join(resultsPath, 'test-summary.json'),
          JSON.stringify(summary, null, 2)
        );
        
        console.log('Performance Summary:', {
          'Total Tests': summary.totalTests,
          'Duration': `${Math.round(summary.totalDuration / 1000)}s`,
          'Passed': summary.passed,
          'Failed': summary.failed,
          'Skipped': summary.skipped,
          'Success Rate': summary.totalTests > 0 
            ? `${Math.round((summary.passed / summary.totalTests) * 100)}%` 
            : '0%'
        });
      }
    } catch (error) {
      console.warn('Could not generate performance report:', error);
    }
  }
});

teardown('cleanup auth files', async () => {
  // Clean up authentication state files
  const authPath = path.join(process.cwd(), 'tests', 'e2e', '.auth');
  
  if (fs.existsSync(authPath)) {
    try {
      const files = fs.readdirSync(authPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(authPath, file));
        }
      });
      console.log('Authentication files cleaned up');
    } catch (error) {
      console.warn('Could not cleanup auth files:', error);
    }
  }
});

teardown('cleanup temporary files', async () => {
  // Clean up any temporary test files
  const tempDirs = [
    path.join(process.cwd(), 'test-results', 'temp'),
    path.join(process.cwd(), 'tests', 'e2e', 'temp')
  ];
  
  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${dir}`);
      } catch (error) {
        console.warn(`Could not cleanup ${dir}:`, error);
      }
    }
  });
});