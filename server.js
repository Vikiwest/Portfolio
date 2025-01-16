const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config(); // To load environment variables

const app = express();
const PORT = process.env.PORT || 5000; // Ensure to fallback to 5000 if not provided

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      console.log('Origin:', origin); // Log the origin to see what’s being sent
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"], // Specify allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
  })
);


// Handle OPTIONS preflight requests for all routes
app.options('*', cors());  // This allows pre-flight requests to all routes


app.use(express.json()); // To parse JSON bodies

// Route to send email
app.post("/send-email", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      host: "smtp.gmail.com",
      port: 465, // or 587 for TLS
      secure: true, // true for 465, false for other ports
    });

    const mailOptions = {
      from: email, // Sender's email (from the form input)
      replyTo: email,
      to: process.env.EMAIL, // Your email (destination)
      subject: `New Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 10px ;">
          <h2 style="color: #333;">New Message from ${name}</h2>
          <p><strong>Sender:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="background-color: #fff; padding: 10px; border-radius: 5px; border: 1px solid #ccc;">${message}</p>
        </div>`,
    };

    const replyOptions = {
      from: process.env.EMAIL, // Your email (the one sending the reply)
      to: email, // Sender's email (the one who filled out the form)
      subject: `Re: New Message from Olorunda Victory`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <h2 style="color: #333;">Thank you for your message, ${name}!</h2>
          <p>We have received your message and will get back to you shortly.</p>
         <p>Best regards,<br>Olorunda Victory</p>
        </div>`,
    };

    // Send the original email
    await transporter.sendMail(mailOptions);
    console.log("Original email sent");

    // Send the reply email
    await transporter.sendMail(replyOptions);
    console.log("Reply email sent");

    // Respond to the client
    res.status(200).json({ message: "Emails sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Error sending email" });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
