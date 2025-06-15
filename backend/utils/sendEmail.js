const nodemailer = require('nodemailer');
const path = require('path');

async function sendReportEmail(email, fullName, filePath) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER, // Gmail or Google Workspace email
      pass: process.env.SMTP_PASS  // App-specific password
    },
    connectionTimeout: 8000, // 8 seconds to connect
    greetingTimeout: 5000,   // 5 seconds to get banner
    socketTimeout: 10000     // 10 seconds total timeout
  });

  try {
    await transporter.sendMail({
      from: '"DiagnoCart" <help.diagnokart@gmail.com>',
      to: email,
      subject: 'Your Diagnostic Test Report is Ready',
      html: `<p>Hi <strong>${fullName}</strong>,<br>Your report is now ready. Please find the attached PDF.</p>`,
      attachments: [
        {
          filename: 'diagnocart_report.pdf',
          path: filePath
        }
      ]
    });

    console.log(`✅ Email sent to ${email}`);
  } catch (err) {
    console.error(`❌ Email send failed for ${email}:`, err.code || err.message);
    throw err; // optional: rethrow to log in calling route
  }
}

module.exports = sendReportEmail;
