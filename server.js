const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Request logging middleware (production-friendly)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Rate limiting
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too many email attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const allowedOrigins = [
  "https://portfoliofront-nppt.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Portfolio Email Service is running!",
    endpoints: {
      root: "GET /",
      health: "GET /health",
      sendEmail: "POST /send-email",
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Email Service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Email validation function
const validateEmailInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  } else if (data.name.length > 100) {
    errors.push("Name must be less than 100 characters");
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.message || data.message.trim().length === 0) {
    errors.push("Message is required");
  } else if (data.message.length > 2000) {
    errors.push("Message must be less than 2000 characters");
  }

  return errors;
  // 
};

// Email template functions with your portfolio theme
const createNotificationTemplate = (name, email, message) => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Portfolio Message</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
        }
        
        .header {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
            padding: 30px;
            text-align: center;
            position: relative;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 4px;
            background: #000;
            border-radius: 2px;
        }
        
        .header h1 {
            color: #000;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .content {
            padding: 40px;
            color: #e5e5e5;
        }
        
        .message-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            backdrop-filter: blur(10px);
        }
        
        .info-grid {
            display: grid;
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .info-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
            border-bottom: 1px solid #333;
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .icon {
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #000;
            font-weight: bold;
        }
        
        .label {
            font-weight: 600;
            color: #fbbf24;
            min-width: 80px;
        }
        
        .value {
            color: #fff;
            font-weight: 500;
        }
        
        .message-content {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 20px;
            margin-top: 10px;
            line-height: 1.6;
            color: #e5e5e5;
            border-left: 4px solid #fbbf24;
        }
        
        .footer {
            background: rgba(0, 0, 0, 0.5);
            padding: 25px;
            text-align: center;
            border-top: 1px solid #333;
        }
        
        .signature {
            color: #fbbf24;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .portfolio-link {
            color: #fbbf24;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            margin-top: 10px;
            padding: 8px 16px;
            border: 1px solid #fbbf24;
            border-radius: 6px;
            transition: all 0.3s ease;
        }
        
        .portfolio-link:hover {
            background: #fbbf24;
            color: #000;
        }
        
        @media (max-width: 480px) {
            .content {
                padding: 25px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            .info-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 New Portfolio Message</h1>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-item">
                    <div class="icon">👤</div>
                    <span class="label">From:</span>
                    <span class="value">${name} (${email})</span>
                </div>
                
                <div class="info-item">
                    <div class="icon">🕒</div>
                    <span class="label">Time:</span>
                    <span class="value">${new Date().toLocaleString()}</span>
                </div>
                
                <div class="info-item">
                    <div class="icon">💬</div>
                    <span class="label">Message:</span>
                </div>
            </div>
            
            <div class="message-content">
                ${message.replace(/\n/g, "<br>")}
            </div>
        </div>
        
        <div class="footer">
            <div class="signature">Olorunda Victory</div>
            <div style="color: #888; font-size: 14px; margin-bottom: 15px;">Full Stack Developer</div>
            <a href="https://your-portfolio-url.com" class="portfolio-link">View Portfolio</a>
        </div>
    </div>
</body>
</html>`;
};

const createAutoReplyTemplate = (name) => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Contacting Olorunda Victory</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
        }
        
        .header {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 4px;
            background: #000;
            border-radius: 2px;
        }
        
        .header h1 {
            color: #000;
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 10px 0;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .header p {
            color: #000;
            font-size: 18px;
            font-weight: 500;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
            color: #e5e5e5;
        }
        
        .welcome-section {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .welcome-section p {
            font-size: 18px;
            line-height: 1.6;
            color: #ccc;
            margin-bottom: 20px;
        }
        
        .highlight {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
        }
        
        .info-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #333;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            backdrop-filter: blur(10px);
        }
        
        .info-card h3 {
            color: #fbbf24;
            font-size: 20px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .social-links {
            display: grid;
            gap: 12px;
        }
        
        .social-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid #444;
            border-radius: 8px;
            transition: all 0.3s ease;
            text-decoration: none;
            color: #e5e5e5;
        }
        
        .social-link:hover {
            background: rgba(251, 191, 36, 0.1);
            border-color: #fbbf24;
            transform: translateX(5px);
        }
        
        .social-icon {
            width: 20px;
            height: 20px;
            background: #fbbf24;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #000;
            font-weight: bold;
        }
        
        .footer {
            background: rgba(0, 0, 0, 0.5);
            padding: 30px;
            text-align: center;
            border-top: 1px solid #333;
        }
        
        .signature {
            color: #fbbf24;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .title {
            color: #888;
            font-size: 16px;
            margin-bottom: 20px;
        }
        
        .note {
            color: #666;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }
        
        .response-time {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #000;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            display: inline-block;
            margin: 10px 0;
        }
        
        @media (max-width: 480px) {
            .content {
                padding: 25px;
            }
            
            .header h1 {
                font-size: 26px;
            }
            
            .header p {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✨ Thank You, ${name}!</h1>
            <p>I appreciate you reaching out</p>
        </div>
        
        <div class="content">
            <div class="welcome-section">
                <p>
                    I've received your message and truly appreciate you taking the time to contact me. 
                    I'll review your message carefully and get back to you within:
                </p>
                <div class="response-time">24-48 Hours</div>
            </div>
            
            <div class="info-card">
                <h3>📞 Stay Connected</h3>
                <div class="social-links">
                    <a href="https://www.linkedin.com/in/victory-olorunda-aa615030a/" class="social-link" target="_blank">
                        <div class="social-icon">in</div>
                        <span>LinkedIn: Victory Olorunda</span>
                    </a>
                    <a href="https://github.com/Vikiwest" class="social-link" target="_blank">
                        <div class="social-icon">Git</div>
                        <span>GitHub: Vikiwest</span>
                    </a>
                    <a href="https://your-portfolio-url.com" class="social-link" target="_blank">
                        <div class="social-icon">🌐</div>
                        <span>Portfolio: Olorunda Victory</span>
                    </a>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="signature">Olorunda Victory</div>
            <div class="title">Full Stack Developer</div>
            <div class="note">
                This is an automated response. Please do not reply to this email.
            </div>
        </div>
    </div>
</body>
</html>`;
};

// Enhanced email route
// Enhanced email route with detailed debugging
app.post("/send-email", emailLimiter, async (req, res) => {
  console.log("Send-email endpoint hit");
  console.log("Request body:", req.body);

  const { name, email, message } = req.body;

  // Input validation
  const validationErrors = validateEmailInput(req.body);
  if (validationErrors.length > 0) {
    console.log("Validation errors:", validationErrors);
    return res.status(400).json({
      success: false,
      errors: validationErrors,
    });
  }

  try {
    console.log("Environment variables check:");
    console.log("EMAIL exists:", !!process.env.EMAIL);
    console.log("EMAIL_PASSWORD exists:", !!process.env.EMAIL_PASSWORD);

    if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
      throw new Error("Email environment variables are not set");
    }

    // Create transporter with more options
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
      secure: true,
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log("Transporter created, attempting to verify...");

    // Verify transporter configuration
    await transporter.verify();
    console.log("✅ Email transporter verified successfully");

    const mailOptions = {
      from: `"Portfolio Contact" <${process.env.EMAIL}>`,
      replyTo: email,
      to: process.env.EMAIL,
      subject: `🎯 Portfolio Contact: ${name}`,
      html: createNotificationTemplate(name, email, message),
    };

    const replyOptions = {
      from: `"Olorunda Victory" <${process.env.EMAIL}>`,
      to: email,
      subject: `Thank you for contacting Olorunda Victory`,
      html: createAutoReplyTemplate(name),
    };

    console.log("Attempting to send notification email...");

    // Send emails with individual error handling
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Notification email sent to ${process.env.EMAIL}`);
    } catch (mailError) {
      console.error("❌ Failed to send notification email:", mailError);
      throw mailError;
    }

    try {
      await transporter.sendMail(replyOptions);
      console.log(`✅ Auto-reply sent to ${email}`);
    } catch (replyError) {
      console.error("❌ Failed to send auto-reply:", replyError);
      // Don't throw here, as the main email might have succeeded
    }

    res.status(200).json({
      success: true,
      message: "Thank you! Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("❌ Detailed email error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
    });

    let errorMessage = "Failed to send email. Please try again later.";
    let statusCode = 500;

    if (error.code === "EAUTH") {
      errorMessage =
        "Email authentication failed. Please check email configuration.";
      statusCode = 503;
      console.error("🔐 AUTH ERROR - Check your Gmail App Password");
    } else if (error.code === "EENVELOPE") {
      errorMessage =
        "Invalid email address. Please check your email and try again.";
      statusCode = 400;
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      errorMessage =
        "Email service temporarily unavailable. Please try again later.";
      statusCode = 503;
    } else if (error.message.includes("environment variables")) {
      errorMessage =
        "Server configuration error. Please contact the administrator.";
      statusCode = 503;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Handle preflight requests
app.options("*", cors());

// Catch-all route for undefined endpoints
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: {
      root: "GET /",
      health: "GET /health",
      sendEmail: "POST /send-email",
    },
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM, shutting down gracefully...");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Email service running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);

  // Check if environment variables are set
  if (!process.env.EMAIL || !process.env.EMAIL_PASSWORD) {
    console.warn(
      "⚠️  WARNING: EMAIL or EMAIL_PASSWORD environment variables are not set!"
    );
  } else {
    console.log("✅ Environment variables loaded successfully");
  }
});
