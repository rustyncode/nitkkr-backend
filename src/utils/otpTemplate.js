const getOtpTemplate = (code) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RustiNet Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f7f9;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #1a1a2e;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            letter-spacing: 2px;
        }
        .content {
            padding: 40px;
            text-align: center;
        }
        .content p {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
        }
        .otp-box {
            background: #f0f4f8;
            padding: 20px;
            border-radius: 8px;
            display: inline-block;
            margin-bottom: 30px;
        }
        .otp-code {
            font-size: 28px;
            font-weight: 800;
            color: #1a1a2e;
            letter-spacing: 8px;
            margin: 0;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #888;
        }
        .divider {
            height: 1px;
            background: #eee;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RustiNet</h1>
        </div>
        <div class="content">
            <p>Welcome to the NIT KKR Student Ecosystem. Use the code below to verify your account.</p>
            <div class="otp-box">
                <span class="otp-code">${code}</span>
            </div>
            <p>This code is valid for <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
            <div class="divider"></div>
            <p style="font-size: 14px;">Team Rustyn • NIT Kurukshetra</p>
        </div>
        <div class="footer">
            &copy; 2026 RustiNet. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

module.exports = getOtpTemplate;
