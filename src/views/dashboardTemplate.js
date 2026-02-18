
const dashboardTemplate = ({
    totalUsers,
    uniqueToday,
    requestsToday,
    topCountries,
    deviceStats,
    recentVisits,
    uptime
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NIT KKR API | Analytics</title>
    <link rel="icon" href="https://nitkkr.ac.in/favicon.ico">
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --success: #22c55e;
            --border: #334155;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 2rem;
            line-height: 1.5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        h1 { margin: 0; font-size: 1.5rem; }
        .status {
            font-size: 0.875rem;
            color: var(--success);
            background: rgba(34, 197, 94, 0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
            border: 1px solid rgba(34, 197, 94, 0.2);
        }
        
        /* Grid Layout */
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        /* Cards */
        .card {
            background: var(--card-bg);
            border-radius: 0.75rem;
            border: 1px solid var(--border);
            padding: 1.5rem;
        }
        .card h2 {
            margin: 0 0 1rem 0;
            font-size: 1rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .big-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--text);
        }
        .sub-text {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }
        th, td {
            text-align: left;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border);
        }
        th { color: var(--text-muted); font-weight: 500; }
        tr:last-child td { border-bottom: none; }
        
        .progress-bar {
            background: var(--border);
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 0.5rem;
        }
        .progress-fill {
            background: var(--accent);
            height: 100%;
        }

        .badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            background: var(--border);
        }
        .mobile { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .desktop { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

        @media (max-width: 600px) {
            body { padding: 1rem; }
            .big-number { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>NIT KKR Sync & Analytics</h1>
                <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">Server Uptime: ${uptime}</div>
            </div>
            <span class="status">● Systems Operational</span>
        </header>

        <!-- KPI Cards -->
        <div class="grid">
            <div class="card">
                <h2>Total Visitors</h2>
                <div class="big-number">${totalUsers.toLocaleString()}</div>
                <div class="sub-text">All time unique IPs</div>
            </div>
            <div class="card">
                <h2>Active Today</h2>
                <div class="big-number">${uniqueToday.toLocaleString()}</div>
                <div class="sub-text">Unique visitors in last 24h</div>
            </div>
            <div class="card">
                <h2>Device Split</h2>
                <div class="big-number">${deviceStats.mobile}%</div>
                <div class="sub-text">Mobile Traffic</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${deviceStats.mobile}%"></div>
                </div>
            </div>
        </div>

        <div class="grid" style="grid-template-columns: 2fr 1fr;">
            <!-- Recent Activity -->
            <div class="card">
                <h2>Recent Live Activity</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Location</th>
                            <th>Device</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentVisits.map(v => `
                        <tr>
                            <td>
                                <div>${v.city || 'Unknown'}, ${v.country || 'Unknown'}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${v.ip}</div>
                            </td>
                            <td><span class="badge ${v.device_type?.toLowerCase()}">${v.device_type || 'Unknown'}</span></td>
                            <td style="color: var(--text-muted);">${v.timeAgo}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Top Countries -->
            <div class="card">
                <h2>Top Locations</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Country</th>
                            <th>Users</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topCountries.map(c => `
                        <tr>
                            <td>${c.country || 'Unknown'}</td>
                            <td style="font-weight: 600;">${c.count}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <footer style="text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 2rem;">
            NIT KKR PYQ API v1.3.0 • <a href="/api/v1/health" style="color: var(--accent);">Health Check</a>
        </footer>
    </div>
</body>
</html>
`;

module.exports = dashboardTemplate;
