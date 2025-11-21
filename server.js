const express = require("express");
const { Resend } = require("resend");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Security middleware
app.use(helmet());

// Request logging middleware
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
  "http://localhost:3001",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
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
};

// UPDATED: Notification template with built-in auto-reply section
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

        /* NEW: Auto-Reply Section */
        .auto-reply-section {
            background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
            border: 2px dashed #fbbf24;
            border-radius: 12px;
            padding: 25px;
            margin-top: 30px;
            position: relative;
        }

        .auto-reply-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .auto-reply-icon {
            font-size: 24px;
        }

        .auto-reply-title {
            color: #fbbf24;
            font-size: 20px;
            font-weight: 700;
            margin: 0;
        }

        .reply-template {
            background: white;
            color: #333;
            padding: 25px;
            border-radius: 8px;
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .reply-template p {
            margin-bottom: 15px;
        }

        .reply-signature {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }

        .quick-action {
            background: rgba(251, 191, 36, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            text-align: center;
        }

        .quick-action p {
            color: #fbbf24;
            font-weight: 600;
            margin: 0 0 10px 0;
        }

        .email-address {
            background: #000;
            color: #fbbf24;
            padding: 8px 16px;
            border-radius: 6px;
            font-family: monospace;
            font-weight: bold;
            border: 1px solid #fbbf24;
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

            .auto-reply-section {
                padding: 20px;
            }

            .reply-template {
                padding: 20px;
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

            <!-- NEW: Auto-Reply Section -->
            <div class="auto-reply-section">
                <div class="auto-reply-header">
                    <div class="auto-reply-icon">📝</div>
                    <h3 class="auto-reply-title">Quick Reply Template</h3>
                </div>
                
                <div class="reply-template">
                    <p>Hi ${name},</p>
                    
                    <p>Thank you so much for reaching out through my portfolio! I truly appreciate you taking the time to contact me.</p>
                    
                    <p>I've received your message and will review it carefully. I'll get back to you with a proper response within <strong>24-48 hours</strong>.</p>
                    
                    <p>In the meantime, feel free to connect with me on:</p>
                    <ul>
                        <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/in/victory-olorunda-aa615030a/" target="_blank">Victory Olorunda</a></li>
                        <li><strong>GitHub:</strong> <a href="https://github.com/Vikiwest" target="_blank">Vikiwest</a></li>
                    </ul>
                    
                    <div class="reply-signature">
                        <p>Best regards,<br>
                        <strong>Olorunda Victory</strong><br>
                        Full Stack Developer</p>
                    </div>
                </div>

                <div class="quick-action">
                    <p>🚀 <strong>Quick Action:</strong> Copy and paste the template above</p>
                    <div class="email-address">Reply to: ${email}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="signature">Olorunda Victory</div>
            <div style="color: #888; font-size: 14px; margin-bottom: 15px;">Full Stack Developer</div>
            <a href="https://portfoliofront-nppt.onrender.com" class="portfolio-link">View Portfolio</a>
        </div>
    </div>
</body>
</html>`;
};

// UPDATED: Email route - ONLY sends notification (no auto-reply)
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
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);

    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Send ONLY the notification email (this works reliably)
    console.log("Sending notification email with built-in auto-reply template...");
    const notificationResult = await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to: ['chidiolorunda@gmail.com'], // Your email
      reply_to: email, // Important: sets the reply-to address
      subject: `🎯 Portfolio Contact from ${name} - REPLY TO: ${email}`,
      html: createNotificationTemplate(name, email, message),
    });

    console.log("✅ Notification email sent successfully");

    res.status(200).json({
      success: true,
      message: "Thank you! Your message has been sent successfully. I'll get back to you within 24 hours.",
    });

  } catch (error) {
    console.error("❌ Resend email error:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: "Failed to send email. Please try again later.",
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
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  WARNING: RESEND_API_KEY environment variable is not set!");
  } else {
    console.log("✅ RESEND_API_KEY environment variable loaded successfully");
  }
});