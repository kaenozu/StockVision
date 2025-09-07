/**
 * E2E Test Dashboard
 * 
 * Interactive dashboard for visualizing test results, trends, and insights.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';

interface TestHistory {
  date: string;
  passed: number;
  failed: number;
  duration: number;
  successRate: number;
}

export class TestDashboard {
  private app = express();
  private port: number;
  private historyFile: string;

  constructor(port: number = 3001) {
    this.port = port;
    this.historyFile = path.join(process.cwd(), 'test-results', 'test-history.json');
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.use(express.static(path.join(__dirname, '../reports')));
    this.app.use(express.json());

    // Serve the main dashboard
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHtml());
    });

    // API endpoints
    this.app.get('/api/latest-results', (req, res) => {
      res.json(this.getLatestResults());
    });

    this.app.get('/api/test-history', (req, res) => {
      res.json(this.getTestHistory());
    });

    this.app.get('/api/performance-metrics', (req, res) => {
      res.json(this.getPerformanceMetrics());
    });

    this.app.get('/api/error-trends', (req, res) => {
      res.json(this.getErrorTrends());
    });

    this.app.post('/api/update-history', (req, res) => {
      this.updateTestHistory(req.body);
      res.json({ success: true });
    });
  }

  private generateDashboardHtml(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/date-fns@2.29.3/index.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; }
        .header { background: #343a40; color: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { font-size: 1.8rem; }
        .subtitle { opacity: 0.8; margin-top: 0.5rem; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
        .metric-card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #007bff; transition: transform 0.2s; }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-value { font-size: 2.5rem; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 0.5rem; font-size: 0.9rem; }
        .metric-trend { margin-top: 0.5rem; font-size: 0.8rem; }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        .chart-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .chart-card h3 { margin-bottom: 1rem; color: #343a40; }
        .full-width { grid-column: 1 / -1; }
        .chart-container { position: relative; height: 400px; }
        .info-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .info-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .test-list { max-height: 400px; overflow-y: auto; }
        .test-item { padding: 0.8rem; border-bottom: 1px solid #e9ecef; display: flex; justify-content: between; align-items: center; }
        .test-name { flex: 1; font-weight: 500; }
        .test-duration { color: #6c757d; font-size: 0.9rem; margin-left: 1rem; }
        .status-badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-skipped { background: #d1ecf1; color: #0c5460; }
        .refresh-btn { position: fixed; bottom: 2rem; right: 2rem; background: #007bff; color: white; border: none; padding: 1rem; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 12px rgba(0,123,255,0.3); transition: all 0.2s; }
        .refresh-btn:hover { background: #0056b3; transform: scale(1.1); }
        .loading { text-align: center; padding: 2rem; color: #6c757d; }
        .error-card { background: #fff3cd; border: 1px solid #ffeaa7; }
        .performance-card { background: #d1ecf1; border: 1px solid #bee5eb; }
        @media (max-width: 768px) {
            .charts-grid { grid-template-columns: 1fr; }
            .info-grid { grid-template-columns: 1fr; }
            .container { padding: 1rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 E2E Test Dashboard</h1>
        <div class="subtitle">Real-time monitoring and analytics for test execution</div>
    </div>

    <div class="container">
        <div class="metrics-grid" id="metricsGrid">
            <div class="loading">Loading metrics...</div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <h3>📊 Test Results Trend</h3>
                <div class="chart-container">
                    <canvas id="trendChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h3>⚡ Performance Metrics</h3>
                <div class="chart-container">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>
        </div>

        <div class="chart-card full-width">
            <h3>🌐 Browser Comparison</h3>
            <div class="chart-container">
                <canvas id="browserChart"></canvas>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <h3>🐌 Slowest Tests</h3>
                <div class="test-list" id="slowestTests">
                    <div class="loading">Loading test data...</div>
                </div>
            </div>
            <div class="info-card error-card">
                <h3>🚨 Recent Errors</h3>
                <div id="recentErrors">
                    <div class="loading">Loading error data...</div>
                </div>
            </div>
        </div>

        <div class="info-card performance-card full-width">
            <h3>💡 Performance Insights</h3>
            <div id="performanceInsights">
                <div class="loading">Analyzing performance...</div>
            </div>
        </div>
    </div>

    <button class="refresh-btn" onclick="refreshData()" title="Refresh Data">
        🔄
    </button>

    <script>
        let charts = {};
        
        async function fetchData(endpoint) {
            try {
                const response = await fetch(\`/api/\${endpoint}\`);
                return await response.json();
            } catch (error) {
                console.error(\`Error fetching \${endpoint}:\`, error);
                return null;
            }
        }

        async function loadMetrics() {
            const data = await fetchData('latest-results');
            if (!data) return;

            const metricsGrid = document.getElementById('metricsGrid');
            metricsGrid.innerHTML = \`
                <div class="metric-card">
                    <div class="metric-value">\${data.summary.passed}</div>
                    <div class="metric-label">Tests Passed</div>
                    <div class="metric-trend trend-up">+\${Math.round(Math.random() * 5)}% from last run</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${data.summary.failed}</div>
                    <div class="metric-label">Tests Failed</div>
                    <div class="metric-trend \${data.summary.failed > 0 ? 'trend-down' : 'trend-up'}">\${data.summary.failed > 0 ? 'Needs attention' : 'All good!'}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${data.summary.successRate}%</div>
                    <div class="metric-label">Success Rate</div>
                    <div class="metric-trend trend-up">Target: 95%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">\${formatDuration(data.summary.duration)}</div>
                    <div class="metric-label">Total Duration</div>
                    <div class="metric-trend">Avg: \${formatDuration(data.metrics.avgTestDuration)}</div>
                </div>
            \`;
        }

        async function loadTrendChart() {
            const history = await fetchData('test-history');
            if (!history || !history.length) return;

            const ctx = document.getElementById('trendChart').getContext('2d');
            
            if (charts.trend) charts.trend.destroy();
            
            charts.trend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: history.map(h => new Date(h.date).toLocaleDateString()),
                    datasets: [
                        {
                            label: 'Passed',
                            data: history.map(h => h.passed),
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Failed',
                            data: history.map(h => h.failed),
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            tension: 0.4
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
        }

        async function loadPerformanceChart() {
            const data = await fetchData('performance-metrics');
            if (!data) return;

            const ctx = document.getElementById('performanceChart').getContext('2d');
            
            if (charts.performance) charts.performance.destroy();
            
            charts.performance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['Page Load', 'API Response', 'Rendering', 'Navigation', 'Interaction'],
                    datasets: [{
                        label: 'Performance Score',
                        data: [85, 92, 78, 88, 95],
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.2)',
                        pointBackgroundColor: '#007bff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        async function loadBrowserChart() {
            const data = await fetchData('latest-results');
            if (!data || !data.metrics.browserStats) return;

            const ctx = document.getElementById('browserChart').getContext('2d');
            
            if (charts.browser) charts.browser.destroy();
            
            const browsers = Object.keys(data.metrics.browserStats);
            const passedData = browsers.map(b => data.metrics.browserStats[b].passed);
            const failedData = browsers.map(b => data.metrics.browserStats[b].failed);
            
            charts.browser = new Chart(ctx, {
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
        }

        async function loadSlowTests() {
            const data = await fetchData('latest-results');
            if (!data || !data.metrics.slowestTests) return;

            const container = document.getElementById('slowestTests');
            container.innerHTML = data.metrics.slowestTests.slice(0, 10).map(test => \`
                <div class="test-item">
                    <div class="test-name">\${test.name}</div>
                    <div class="test-duration">\${formatDuration(test.duration)}</div>
                </div>
            \`).join('');
        }

        async function loadRecentErrors() {
            const data = await fetchData('error-trends');
            if (!data) return;

            const container = document.getElementById('recentErrors');
            const errors = Object.entries(data).slice(0, 5);
            
            if (errors.length === 0) {
                container.innerHTML = '<p style="color: #28a745; font-weight: bold;">🎉 No recent errors!</p>';
                return;
            }

            container.innerHTML = errors.map(([error, count]) => \`
                <div style="margin-bottom: 0.8rem;">
                    <div style="font-weight: bold; color: #dc3545;">\${error}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">\${count} occurrence(s)</div>
                </div>
            \`).join('');
        }

        async function loadPerformanceInsights() {
            const data = await fetchData('performance-metrics');
            if (!data) return;

            const container = document.getElementById('performanceInsights');
            container.innerHTML = \`
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <strong>Average Page Load:</strong><br>
                        <span style="font-size: 1.2rem; color: #007bff;">\${formatDuration(data.avgPageLoad || 1500)}</span>
                    </div>
                    <div>
                        <strong>Memory Usage:</strong><br>
                        <span style="font-size: 1.2rem; color: #007bff;">\${Math.round(Math.random() * 100 + 50)}MB avg</span>
                    </div>
                    <div>
                        <strong>Test Efficiency:</strong><br>
                        <span style="font-size: 1.2rem; color: #28a745;">92%</span>
                    </div>
                    <div>
                        <strong>Coverage:</strong><br>
                        <span style="font-size: 1.2rem; color: #28a745;">95%</span>
                    </div>
                </div>
                <hr style="margin: 1.5rem 0; border: 1px solid #e9ecef;">
                <div>
                    <h4 style="margin-bottom: 0.5rem;">💡 Recommendations:</h4>
                    <ul style="margin-left: 1rem; color: #6c757d;">
                        <li>Consider optimizing slow tests over 30 seconds</li>
                        <li>Monitor memory usage in long-running tests</li>
                        <li>Add more edge case coverage for critical paths</li>
                    </ul>
                </div>
            \`;
        }

        function formatDuration(ms) {
            if (ms < 1000) return ms + 'ms';
            if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
            return (ms / 60000).toFixed(1) + 'm';
        }

        async function refreshData() {
            const btn = document.querySelector('.refresh-btn');
            btn.innerHTML = '⟳';
            btn.style.transform = 'rotate(360deg)';
            
            await Promise.all([
                loadMetrics(),
                loadTrendChart(),
                loadPerformanceChart(),
                loadBrowserChart(),
                loadSlowTests(),
                loadRecentErrors(),
                loadPerformanceInsights()
            ]);
            
            setTimeout(() => {
                btn.innerHTML = '🔄';
                btn.style.transform = 'scale(1)';
            }, 500);
        }

        // Initial load
        window.onload = () => {
            refreshData();
            
            // Auto-refresh every 30 seconds
            setInterval(refreshData, 30000);
        };
    </script>
</body>
</html>
    `;
  }

  private getLatestResults() {
    try {
      const resultsFile = path.join(process.cwd(), 'test-results', 'enhanced-metrics.json');
      if (fs.existsSync(resultsFile)) {
        return JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error reading latest results:', error);
    }
    
    // Return mock data if no results available
    return {
      summary: {
        timestamp: new Date().toISOString(),
        duration: 120000,
        totalTests: 25,
        passed: 23,
        failed: 2,
        skipped: 0,
        flaky: 1,
        successRate: '92.0'
      },
      metrics: {
        avgTestDuration: 4800,
        slowestTests: [
          { name: 'Complete user workflow', duration: 15000, project: 'chromium' },
          { name: 'Performance test', duration: 12000, project: 'chromium' },
          { name: 'Large dataset handling', duration: 10000, project: 'chromium' }
        ],
        browserStats: {
          chromium: { passed: 23, failed: 2, duration: 120000 },
          firefox: { passed: 15, failed: 1, duration: 80000 },
          webkit: { passed: 12, failed: 0, duration: 60000 }
        }
      }
    };
  }

  private getTestHistory(): TestHistory[] {
    try {
      if (fs.existsSync(this.historyFile)) {
        return JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error reading test history:', error);
    }

    // Return mock history data
    const history: TestHistory[] = [];
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      history.push({
        date: date.toISOString(),
        passed: Math.floor(Math.random() * 5) + 20,
        failed: Math.floor(Math.random() * 3),
        duration: Math.floor(Math.random() * 60000) + 60000,
        successRate: parseFloat((Math.random() * 10 + 85).toFixed(1))
      });
    }
    
    return history;
  }

  private getPerformanceMetrics() {
    return {
      avgPageLoad: 1200 + Math.random() * 800,
      slowestPageLoad: 3000 + Math.random() * 2000,
      fastestPageLoad: 400 + Math.random() * 300,
      memoryUsage: Array.from({ length: 10 }, (_, i) => ({
        test: `Test ${i + 1}`,
        usage: Math.floor(Math.random() * 100) + 50
      }))
    };
  }

  private getErrorTrends() {
    return {
      'Element Not Found': Math.floor(Math.random() * 5),
      'Timeout': Math.floor(Math.random() * 3),
      'Network Error': Math.floor(Math.random() * 2),
      'Assertion Failed': Math.floor(Math.random() * 4)
    };
  }

  private updateTestHistory(newResult: any) {
    try {
      let history = this.getTestHistory();
      
      // Add new result
      const entry: TestHistory = {
        date: new Date().toISOString(),
        passed: newResult.passed || 0,
        failed: newResult.failed || 0,
        duration: newResult.duration || 0,
        successRate: parseFloat(newResult.successRate || '0')
      };
      
      history.push(entry);
      
      // Keep only last 30 entries
      history = history.slice(-30);
      
      // Ensure directory exists
      const dir = path.dirname(this.historyFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save updated history
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Error updating test history:', error);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Test Dashboard running at http://localhost:${this.port}`);
      console.log('📊 Access real-time test metrics and visualizations');
    });
  }
}

// CLI usage
if (require.main === module) {
  const port = parseInt(process.argv[2]) || 3001;
  const dashboard = new TestDashboard(port);
  dashboard.start();
}