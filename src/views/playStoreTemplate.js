
module.exports = ({
    downloadLink = "https://expo.dev/artifacts/eas/e1xfScJJZE4xdduBQHVCoD.apk",
    logoUrl = "/logo.png",
    screenshotUrls = [],
    reviews = []
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RustiNet AppStore</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        :root {
            --primary: #01875f;
            --text-primary: #202124;
            --text-secondary: #5f6368;
            --bg-color: #ffffff;
            --surface: #ffffff;
            --border: #dadce0;
        }

        body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--bg-color);
            color: var(--text-primary);
        }

        /* Header */
        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 24px;
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            background: #fff;
            z-index: 100;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .gp-logo {
            height: 24px;
            width: auto;
        }

        /* Main Content */
        main {
            max-width: 900px;
            margin: 0 auto;
            padding: 24px;
        }

        .app-header {
            display: flex;
            gap: 24px;
            margin-bottom: 32px;
        }

        .app-icon {
            width: 72px;
            height: 72px;
            border-radius: 20%;
            background: #f1f3f4; /* Placeholder if image invalid */
            box-shadow: 0 1px 2px rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
            flex-shrink: 0;
            overflow: hidden;
        }
        
        .app-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .app-info {
            flex: 1;
        }

        h1 {
            font-size: 24px;
            font-weight: 500;
            margin: 0 0 4px 0;
            color: var(--text-primary);
        }

        .developer {
            color: var(--primary);
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 16px;
            display: block;
            text-decoration: none;
        }

        .stats-row {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 24px;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-right: 24px;
            position: relative;
        }

        .stat-item::after {
            content: '';
            position: absolute;
            right: 0;
            top: 20%;
            height: 60%;
            width: 1px;
            background: var(--border);
        }
        
        .stat-item:last-child::after {
            display: none;
        }

        .stat-val {
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        .install-btn {
            background-color: var(--primary);
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-family: 'Roboto', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
            text-decoration: none;
            display: inline-block;
            width: 100%;
            text-align: center;
            box-sizing: border-box;
        }

        .install-btn:hover {
            background-color: #017150;
        }

        .screenshots {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 16px;
            margin-bottom: 32px;
            scrollbar-width: none; /* Firefox */
        }
        
        .screenshots::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
        }

        .screenshot {
            width: 180px; /* Portrait aspect roughly */
            height: 320px;
            background: #f8f9fa;
            border-radius: 8px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }

        .about-section h2 {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .b-text {
            line-height: 1.5;
            color: var(--text-secondary);
            font-size: 14px;
        }

        .tags {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .tag {
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 6px 16px;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-secondary);
        }

        /* Reviews Section */
        .reviews-section {
            padding-top: 32px;
            border-top: 1px solid var(--border);
            margin-top: 32px;
        }

        .review-card {
            margin-bottom: 24px;
        }

        .review-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e8f0fe;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 500;
            color: var(--primary);
        }

        .user-name {
            font-size: 14px;
            font-weight: 500;
        }

        .rating-stars {
            display: flex;
            color: var(--primary);
            font-size: 12px;
            margin-bottom: 4px;
        }

        .review-text {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.4;
        }

        /* Installation Guide */
        .guide-section {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-top: 32px;
            border: 1px solid var(--border);
        }

        .guide-section h3 {
            margin-top: 0;
            font-size: 16px;
            color: var(--primary);
        }

        .step {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: var(--text-secondary);
        }

        .step-num {
            background: var(--primary);
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-weight: bold;
        }

        /* Section Headings */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .section-header h2 {
            font-size: 18px;
            font-weight: 500;
            margin: 0;
        }

        .whats-new {
            margin-bottom: 32px;
        }

        .version-info {
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .data-safety {
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            margin-top: 32px;
        }

        .safety-item {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }

        .safety-item .material-icons {
            color: var(--text-secondary);
        }

        .safety-text h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 500;
        }

        .safety-text p {
            margin: 0;
            font-size: 13px;
            color: var(--text-secondary);
        }

        .dev-contact {
            margin-top: 32px;
            padding-bottom: 40px;
        }

        .contact-item {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            color: var(--text-secondary);
            font-size: 14px;
        }

        /* Mobile Responsive */
        @media (max-width: 600px) {
            .app-header {
                flex-direction: column;
                gap: 16px;
            }
            
            .header-top {
                display: flex;
                gap: 16px;
            }

            .install-btn {
                display: block;
                width: 100%;
            }
            
            .stats-row {
                justify-content: space-between;
            }
            
            .stat-item {
                padding-right: 0;
                flex: 1;
            }
            
            .stat-item::after { 
                display: none; 
            }
        }
    </style>
</head>
<body>

    <header>
        <div class="logo-section">
            <svg class="gp-logo" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M28.05 13.56L9.65 3.17c-1.12-.66-2.52-.39-3.26.6-.28.38-.43.83-.43 1.3v29.86c0 1.25 1.01 2.27 2.26 2.27.47 0 .93-.15 1.31-.43l18.45-10.46c1.17-.66 1.58-2.14.92-3.31-.22-.39-.53-.72-.85-.94z"/>
                <path fill="#34A853" d="M28.05 13.56L9.65 3.17c-1.12-.66-2.52-.39-3.26.6-.28.38-.43.83-.43 1.3v29.86c0 1.25 1.01 2.27 2.26 2.27.47 0 .93-.15 1.31-.43l18.45-10.46c1.17-.66 1.58-2.14.92-3.31-.22-.39-.53-.72-.85-.94z"/>
                <path fill="#FBBC04" d="M6.39 37.23c.3.22.66.34 1.03.34 1.25 0 2.26-1.02 2.26-2.27V5.47c0-1.25-1.01-2.27-2.26-2.27-.37 0-.73.12-1.03.34L25.3 19.33 6.39 37.23z"/>
                <path fill="#EA4335" d="M28.05 26.44L6.39 37.23l18.91-17.9L6.39 3.53l21.66 10.79c1.17.66 1.58 2.14.92 3.31-.22.39-.53.72-.85.94l-.07-.13z"/>
            </svg>
            <span style="font-size: 20px; color: var(--text-secondary); font-family: 'Product Sans', sans-serif;">RustiNet AppStore</span>
        </div>
        <div>
            <span class="material-icons" style="color: var(--text-secondary);">search</span>
        </div>
    </header>

    <main>
        <div class="app-header">
            <div class="header-top">
                <div class="app-icon">
                    <!-- Replace with real icon URL -->
                    <img src="${logoUrl}" alt="RustiNet Icon">
                </div>
                <div class="app-info mobile-only">
                    <h1>RustiNet</h1>
                    <a href="#" class="developer">NIT Kurukshetra</a>
                </div>
            </div>

            <div class="app-info desktop-only">
                <h1>RustiNet</h1>
                <a href="#" class="developer">NIT Kurukshetra</a>
                
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-val">4.8 <span class="material-icons" style="font-size: 14px;">star</span></div>
                        <div class="stat-label">124 reviews</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-val">1K+</div>
                        <div class="stat-label">Downloads</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-val">E</div>
                        <div class="stat-label">Everyone</div>
                    </div>
                </div>

                <a href="${downloadLink || '#'}" class="install-btn">
                    ${downloadLink ? 'Install' : 'Coming Soon'}
                </a>
            </div>
        </div>
        
        <!-- Mobile Stats Row (dup for layout) -->
        <style>
            .mobile-only { display: none; }
            .desktop-only { display: block; }
            @media(max-width: 600px) {
                .mobile-only { display: block; }
                .desktop-only .app-info { display: none; } /* Hide title inside flex */
            .desktop-only h1, .desktop-only .developer { display: none; }
                .desktop-only { display: block; width: 100%; }
            }
        </style>

        <div class="screenshots">
            ${screenshotUrls.length > 0
        ? screenshotUrls.map((url, i) => `<img src="${url}" class="screenshot" alt="Screenshot ${i + 1}">`).join('')
        : `
                <div class="screenshot">Screenshot 1</div>
                <div class="screenshot">Screenshot 2</div>
                <div class="screenshot">Screenshot 3</div>
                <div class="screenshot">Screenshot 4</div>
                `
    }
        </div>

        <!-- What's New -->
        <div class="whats-new">
            <div class="section-header">
                <h2>What's new</h2>
                <span class="material-icons">arrow_forward</span>
            </div>
            <p class="version-info">Version 1.0.2 • Updated on Feb 20, 2026</p>
            <p class="b-text">
                • New Attendance Tracker with 75% goal visualization.<br>
                • Added Job & Internship portal for graduating batches.<br>
                • Performance improvements for PDF viewing.<br>
                • Bug fixes for real-time notifications.
            </p>
        </div>

        <div class="about-section">
             <div class="section-header">
                <h2>About this app</h2>
                <span class="material-icons">arrow_forward</span>
             </div>
             <p class="b-text">
                The official unofficial app for NIT Kurukshetra students. Access Previous Year Questions (PYQs), 
                check real-time notifications, browse job openings, and more.
             </p>
             <p class="b-text">
                <b>Key Features:</b><br>
                • 📚 Instant access to thousands of PYQs<br>
                • 🔔 Real-time college notifications<br>
                • 💼 Internship & Job opportunities<br>
                • 🏎️ Lightning fast native performance
             </p>

             <div class="tags">
                 <div class="tag">Education</div>
                 <div class="tag">Productivity</div>
                 <div class="tag">Student Tools</div>
             </div>
        </div>

        <!-- Data Safety -->
        <div class="data-safety">
            <div class="section-header">
                <h2>Data safety</h2>
                <span class="material-icons">arrow_forward</span>
            </div>
            <p class="b-text" style="margin-bottom: 20px;">Safety starts with understanding how developers collect and share your data.</p>
            
            <div class="safety-item">
                <span class="material-icons">cloud_off</span>
                <div class="safety-text">
                    <h4>No data shared with third parties</h4>
                    <p>The developer says that this app doesn't share user data with other companies or organizations.</p>
                </div>
            </div>
            <div class="safety-item">
                <span class="material-icons">sync_disabled</span>
                <div class="safety-text">
                    <h4>No data collected</h4>
                    <p>The developer says that this app doesn't collect user data.</p>
                </div>
            </div>
            <div class="safety-item">
                <span class="material-icons">lock</span>
                <div class="safety-text">
                    <h4>Data is encrypted in transit</h4>
                    <p>Your data is transferred over a secure connection.</p>
                </div>
            </div>
        </div>

        <!-- Installation Guide -->
        <div class="guide-section">
            <h3>How to Download & Install</h3>
            <div class="step">
                <div class="step-num">1</div>
                <div>Tap the <b>Install</b> button above to download the APK file.</div>
            </div>
            <div class="step">
                <div class="step-num">2</div>
                <div>If your browser shows a "File might be harmful" warning, tap <b>Download anyway</b>.</div>
            </div>
            <div class="step">
                <div class="step-num">3</div>
                <div>Once downloaded, open the file. If blocked, go to <b>Settings</b> and enable <b>"Allow from this source"</b>.</div>
            </div>
            <div class="step">
                <div class="step-num">4</div>
                <div>Tap <b>Install</b> and then <b>Open</b> to start using RustiNet!</div>
            </div>
        </div>

        <!-- Static Reviews -->
        <div class="reviews-section">
            <h2>Ratings and reviews</h2>
            
            <div class="review-card">
                <div class="review-header">
                    <div class="user-avatar">A</div>
                    <div class="user-name">Aryan Sharma</div>
                </div>
                <div class="rating-stars">
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                </div>
                <div class="review-text">
                    Finally an app that makes finding PYQs so easy. The UI is clean and the notifications are really helpful!
                </div>
            </div>

            <div class="review-card">
                <div class="review-header">
                    <div class="user-avatar">I</div>
                    <div class="user-name">Isha Verma</div>
                </div>
                <div class="rating-stars">
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                </div>
                <div class="review-text">
                    Best companion for exam preparation. The attendance tracker is a lifesaver for keeping track of the 75% criteria.
                </div>
            </div>

            <div class="review-card">
                <div class="review-header">
                    <div class="user-avatar">R</div>
                    <div class="user-name">Rahul Gupta</div>
                </div>
                <div class="rating-stars">
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 14px;">star</span>
                    <span class="material-icons" style="font-size: 12px; color: #dadce0;">star</span>
                </div>
                <div class="review-text">
                    Great initiative! Would love to see more notes added soon. Overall, a great experience.
                </div>
            </div>
        </div>

        <!-- Developer Contact -->
        <div class="dev-contact">
            <div class="section-header">
                <h2>Developer contact</h2>
            </div>
            <div class="contact-item">
                <span class="material-icons">language</span>
                <span>nitkkr-app.vercel.app</span>
            </div>
            <div class="contact-item">
                <span class="material-icons">email</span>
                <span>support@nitkkr-app.com</span>
            </div>
            <div class="contact-item">
                <span class="material-icons">location_on</span>
                <span>NIT Kurukshetra, Haryana, India</span>
            </div>
        </div>

    </main>

</body>
</html>
`;
