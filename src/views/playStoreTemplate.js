
module.exports = ({ downloadLink = "https://expo.dev/artifacts/eas/e1xfScJJZE4xdduBQHVCoD.apk" }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RustiNet - Google Play</title>
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
                    <img src="https://nitkkr.ac.in/wp-content/uploads/2023/09/cropped-nitlogo-1-e1711375918194.png" alt="RustiNet Icon">
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
            <div class="screenshot">Screenshot 1</div>
            <div class="screenshot">Screenshot 2</div>
            <div class="screenshot">Screenshot 3</div>
            <div class="screenshot">Screenshot 4</div>
        </div>

        <div class="about-section">
             <h2>About this app <span class="material-icons">arrow_forward</span></h2>
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

    </main>

</body>
</html>
`;
