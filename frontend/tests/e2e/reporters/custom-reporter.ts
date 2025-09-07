/**
 * Custom Playwright Reporter
 * 
 * Enhanced reporting with detailed metrics, visualizations, and actionable insights.
 */

import { Reporter, FullConfig, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

interface TestMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  duration: number;
  avgTestDuration: number;
  slowestTests: Array<{ name: string; duration: number; project: string }>;
  fastestTests: Array<{ name: string; duration: number; project: string }>;
  browserStats: { [browser: string]: { passed: number; failed: number; duration: number } };
  fileStats: { [file: string]: { passed: number; failed: number; duration: number; tests: number } };
  errorSummary: { [error: string]: number };
  performanceMetrics: {
    avgPageLoad: number;
    slowestPageLoad: number;
    fastestPageLoad: number;
    memoryUsage: Array<{ test: string; usage: number }>;
  };
}

export class CustomReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private startTime: number = 0;
  private results: TestResult[] = [];
  private metrics: TestMetrics = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    duration: 0,
    avgTestDuration: 0,
    slowestTests: [],
    fastestTests: [],
    browserStats: {},
    fileStats: {},
    errorSummary: {},
    performanceMetrics: {
      avgPageLoad: 0,
      slowestPageLoad: 0,
      fastestPageLoad: 0,
      memoryUsage: []
    }
  };

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
    this.startTime = Date.now();
    
    console.log('\n🚀 Starting E2E Test Suite');
    console.log(`📊 Running ${suite.allTests().length} tests across ${config.projects.length} project(s)`);
    console.log(`⚙️  Configuration: ${config.workers} worker(s), timeout: ${config.timeout}ms`);
    console.log('─'.repeat(60));
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push(result);
    
    // Update basic metrics
    this.metrics.totalTests++;
    
    switch (result.status) {
      case 'passed':
        this.metrics.passed++;
        break;
      case 'failed':
        this.metrics.failed++;
        this.extractErrorInfo(result);
        break;
      case 'skipped':
        this.metrics.skipped++;
        break;
      case 'timedOut':
        this.metrics.failed++;
        this.metrics.errorSummary['Timeout'] = (this.metrics.errorSummary['Timeout'] || 0) + 1;
        break;
    }

    // Update flaky test count
    if (result.retry > 0 && result.status === 'passed') {
      this.metrics.flaky++;
    }

    // Update browser stats
    const projectName = test.parent.project()?.name || 'unknown';
    if (!this.metrics.browserStats[projectName]) {
      this.metrics.browserStats[projectName] = { passed: 0, failed: 0, duration: 0 };
    }
    
    this.metrics.browserStats[projectName].duration += result.duration;
    if (result.status === 'passed') {
      this.metrics.browserStats[projectName].passed++;
    } else if (result.status === 'failed') {
      this.metrics.browserStats[projectName].failed++;
    }

    // Update file stats
    const fileName = this.getRelativeFilePath(test.location?.file || '');
    if (!this.metrics.fileStats[fileName]) {
      this.metrics.fileStats[fileName] = { passed: 0, failed: 0, duration: 0, tests: 0 };
    }
    
    this.metrics.fileStats[fileName].tests++;
    this.metrics.fileStats[fileName].duration += result.duration;
    if (result.status === 'passed') {
      this.metrics.fileStats[fileName].passed++;
    } else if (result.status === 'failed') {
      this.metrics.fileStats[fileName].failed++;
    }

    // Track test performance
    const testInfo = {
      name: test.title,
      duration: result.duration,
      project: projectName
    };

    this.metrics.slowestTests.push(testInfo);
    this.metrics.fastestTests.push(testInfo);

    // Keep only top 10 slowest/fastest
    this.metrics.slowestTests.sort((a, b) => b.duration - a.duration).splice(10);
    this.metrics.fastestTests.sort((a, b) => a.duration - b.duration).splice(10);

    // Extract performance metrics from steps
    this.extractPerformanceMetrics(test, result);
  }

  onEnd() {
    this.metrics.duration = Date.now() - this.startTime;
    this.metrics.avgTestDuration = this.metrics.totalTests > 0 
      ? this.results.reduce((sum, r) => sum + r.duration, 0) / this.metrics.totalTests 
      : 0;

    this.calculatePerformanceAverages();
    this.printConsoleReport();
    this.generateHtmlReport();
    this.generateJsonReport();
    this.generateCsvReport();
  }

  private extractErrorInfo(result: TestResult) {
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        const errorType = this.categorizeError(error.message);
        this.metrics.errorSummary[errorType] = (this.metrics.errorSummary[errorType] || 0) + 1;
      });
    }
  }

  private categorizeError(message: string): string {
    if (message.includes('timeout') || message.includes('Timeout')) return 'Timeout';
    if (message.includes('locator')) return 'Element Not Found';
    if (message.includes('expect')) return 'Assertion Failed';
    if (message.includes('network') || message.includes('fetch')) return 'Network Error';
    if (message.includes('navigation')) return 'Navigation Error';
    if (message.includes('browser')) return 'Browser Error';
    return 'Other Error';
  }

  private extractPerformanceMetrics(test: TestCase, result: TestResult) {
    // Extract page load times from steps if available
    result.steps.forEach(step => {
      if (step.title.includes('goto') || step.title.includes('navigation')) {
        const pageLoadTime = step.duration;
        
        if (pageLoadTime > this.metrics.performanceMetrics.slowestPageLoad) {
          this.metrics.performanceMetrics.slowestPageLoad = pageLoadTime;
        }
        
        if (this.metrics.performanceMetrics.fastestPageLoad === 0 || 
            pageLoadTime < this.metrics.performanceMetrics.fastestPageLoad) {
          this.metrics.performanceMetrics.fastestPageLoad = pageLoadTime;
        }
      }
    });

    // Extract memory usage if available in test output
    const memoryMatch = result.stdout.find(output => output.includes('Memory'));
    if (memoryMatch) {
      const match = memoryMatch.match(/(\d+)MB/);
      if (match) {
        this.metrics.performanceMetrics.memoryUsage.push({
          test: test.title,
          usage: parseInt(match[1])
        });
      }
    }
  }

  private calculatePerformanceAverages() {
    const pageLoadTimes = this.results.flatMap(result => 
      result.steps
        .filter(step => step.title.includes('goto') || step.title.includes('navigation'))
        .map(step => step.duration)
    );

    if (pageLoadTimes.length > 0) {
      this.metrics.performanceMetrics.avgPageLoad = 
        pageLoadTimes.reduce((sum, time) => sum + time, 0) / pageLoadTimes.length;
    }
  }

  private printConsoleReport() {
    console.log('\n📋 Test Execution Summary');
    console.log('═'.repeat(60));
    
    // Basic stats
    console.log(`✅ Passed: ${this.metrics.passed}`);
    console.log(`❌ Failed: ${this.metrics.failed}`);
    console.log(`⏭️  Skipped: ${this.metrics.skipped}`);
    console.log(`🔄 Flaky: ${this.metrics.flaky}`);
    console.log(`⏱️  Total Duration: ${this.formatDuration(this.metrics.duration)}`);
    console.log(`📊 Average Test Duration: ${this.formatDuration(this.metrics.avgTestDuration)}`);
    
    // Success rate
    const successRate = this.metrics.totalTests > 0 
      ? ((this.metrics.passed / this.metrics.totalTests) * 100).toFixed(1)
      : '0.0';
    console.log(`🎯 Success Rate: ${successRate}%`);

    // Browser performance
    if (Object.keys(this.metrics.browserStats).length > 0) {
      console.log('\n🌐 Browser Performance:');
      Object.entries(this.metrics.browserStats).forEach(([browser, stats]) => {
        const rate = stats.passed + stats.failed > 0 
          ? ((stats.passed / (stats.passed + stats.failed)) * 100).toFixed(1)
          : '0.0';
        console.log(`  ${browser}: ${rate}% success, ${this.formatDuration(stats.duration)}`);
      });
    }

    // Top slowest tests
    if (this.metrics.slowestTests.length > 0) {
      console.log('\n🐌 Slowest Tests:');
      this.metrics.slowestTests.slice(0, 5).forEach((test, i) => {
        console.log(`  ${i + 1}. ${test.name} (${test.project}): ${this.formatDuration(test.duration)}`);
      });
    }

    // Error summary
    if (Object.keys(this.metrics.errorSummary).length > 0) {
      console.log('\n🚨 Error Summary:');
      Object.entries(this.metrics.errorSummary)
        .sort(([, a], [, b]) => b - a)
        .forEach(([error, count]) => {
          console.log(`  ${error}: ${count} occurrence(s)`);
        });
    }

    // Performance insights
    if (this.metrics.performanceMetrics.avgPageLoad > 0) {
      console.log('\n⚡ Performance Insights:');
      console.log(`  Average Page Load: ${this.formatDuration(this.metrics.performanceMetrics.avgPageLoad)}`);
      console.log(`  Slowest Page Load: ${this.formatDuration(this.metrics.performanceMetrics.slowestPageLoad)}`);
      console.log(`  Fastest Page Load: ${this.formatDuration(this.metrics.performanceMetrics.fastestPageLoad)}`);
    }

    console.log('\n═'.repeat(60));
  }

  private generateHtmlReport() {
    const htmlContent = this.generateHtmlContent();
    const outputDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(outputDir, 'enhanced-report.html'), htmlContent);
    console.log(`📊 Enhanced HTML report: ${path.join(outputDir, 'enhanced-report.html')}`);
  }

  private generateHtmlContent(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report - ${new Date().toLocaleDateString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .chart-wrapper { position: relative; height: 400px; }
        .table-container { overflow-x: auto; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; background: white; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-skipped { color: #6c757d; font-weight: bold; }
        .error-summary { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
        .performance-insights { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 E2E Test Report</h1>
            <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
            <p>Total Duration: ${this.formatDuration(this.metrics.duration)}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${this.metrics.passed}</div>
                <div class="metric-label">Passed Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.failed}</div>
                <div class="metric-label">Failed Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((this.metrics.passed / this.metrics.totalTests) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.formatDuration(this.metrics.avgTestDuration)}</div>
                <div class="metric-label">Avg Test Duration</div>
            </div>
        </div>

        <div class="chart-container">
            <h3>Test Results Distribution</h3>
            <div class="chart-wrapper">
                <canvas id="resultsChart"></canvas>
            </div>
        </div>

        <div class="chart-container">
            <h3>Browser Performance Comparison</h3>
            <div class="chart-wrapper">
                <canvas id="browserChart"></canvas>
            </div>
        </div>

        ${Object.keys(this.metrics.errorSummary).length > 0 ? `
        <div class="error-summary">
            <h3>🚨 Error Summary</h3>
            ${Object.entries(this.metrics.errorSummary)
              .sort(([, a], [, b]) => b - a)
              .map(([error, count]) => `<p><strong>${error}:</strong> ${count} occurrence(s)</p>`)
              .join('')}
        </div>
        ` : ''}

        <div class="table-container">
            <h3>📊 Test File Performance</h3>
            <table>
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Duration</th>
                        <th>Success Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(this.metrics.fileStats)
                      .sort(([, a], [, b]) => b.duration - a.duration)
                      .map(([file, stats]) => {
                        const successRate = stats.tests > 0 ? ((stats.passed / stats.tests) * 100).toFixed(1) : '0.0';
                        return `
                        <tr>
                            <td>${file}</td>
                            <td>${stats.tests}</td>
                            <td class="status-passed">${stats.passed}</td>
                            <td class="status-failed">${stats.failed}</td>
                            <td>${this.formatDuration(stats.duration)}</td>
                            <td>${successRate}%</td>
                        </tr>
                        `;
                      }).join('')}
                </tbody>
            </table>
        </div>

        ${this.metrics.slowestTests.length > 0 ? `
        <div class="table-container">
            <h3>🐌 Slowest Tests</h3>
            <table>
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Project</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.metrics.slowestTests.slice(0, 10)
                      .map(test => `
                        <tr>
                            <td>${test.name}</td>
                            <td>${test.project}</td>
                            <td>${this.formatDuration(test.duration)}</td>
                        </tr>
                      `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${this.metrics.performanceMetrics.avgPageLoad > 0 ? `
        <div class="performance-insights">
            <h3>⚡ Performance Insights</h3>
            <p><strong>Average Page Load:</strong> ${this.formatDuration(this.metrics.performanceMetrics.avgPageLoad)}</p>
            <p><strong>Slowest Page Load:</strong> ${this.formatDuration(this.metrics.performanceMetrics.slowestPageLoad)}</p>
            <p><strong>Fastest Page Load:</strong> ${this.formatDuration(this.metrics.performanceMetrics.fastestPageLoad)}</p>
        </div>
        ` : ''}
    </div>

    <script>
        // Results distribution chart
        const resultsCtx = document.getElementById('resultsChart').getContext('2d');
        new Chart(resultsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed', 'Skipped'],
                datasets: [{
                    data: [${this.metrics.passed}, ${this.metrics.failed}, ${this.metrics.skipped}],
                    backgroundColor: ['#28a745', '#dc3545', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        // Browser performance chart
        const browserCtx = document.getElementById('browserChart').getContext('2d');
        const browserData = ${JSON.stringify(this.metrics.browserStats)};
        const browsers = Object.keys(browserData);
        const passedData = browsers.map(b => browserData[b].passed);
        const failedData = browsers.map(b => browserData[b].failed);

        new Chart(browserCtx, {
            type: 'bar',
            data: {
                labels: browsers,
                datasets: [
                    {
                        label: 'Passed',
                        data: passedData,
                        backgroundColor: '#28a745'
                    },
                    {
                        label: 'Failed',
                        data: failedData,
                        backgroundColor: '#dc3545'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>
    `;
  }

  private generateJsonReport() {
    const jsonReport = {
      summary: {
        timestamp: new Date().toISOString(),
        duration: this.metrics.duration,
        totalTests: this.metrics.totalTests,
        passed: this.metrics.passed,
        failed: this.metrics.failed,
        skipped: this.metrics.skipped,
        flaky: this.metrics.flaky,
        successRate: ((this.metrics.passed / this.metrics.totalTests) * 100).toFixed(1)
      },
      metrics: this.metrics,
      config: {
        workers: this.config.workers,
        timeout: this.config.timeout,
        projects: this.config.projects.map(p => p.name)
      }
    };

    const outputDir = path.join(process.cwd(), 'test-results');
    fs.writeFileSync(path.join(outputDir, 'enhanced-metrics.json'), JSON.stringify(jsonReport, null, 2));
  }

  private generateCsvReport() {
    const csvHeaders = [
      'Test Name',
      'File',
      'Project',
      'Status',
      'Duration (ms)',
      'Retry Count',
      'Error Message'
    ];

    const csvRows = this.results.map((result, index) => {
      const test = this.suite.allTests()[index];
      return [
        test?.title || 'Unknown',
        this.getRelativeFilePath(test?.location?.file || ''),
        test?.parent.project()?.name || 'unknown',
        result.status,
        result.duration.toString(),
        result.retry.toString(),
        result.errors.map(e => e.message.replace(/"/g, '""')).join('; ')
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const outputDir = path.join(process.cwd(), 'test-results');
    fs.writeFileSync(path.join(outputDir, 'test-results.csv'), csvContent);
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  private getRelativeFilePath(fullPath: string): string {
    return path.relative(process.cwd(), fullPath);
  }
}

export default CustomReporter;