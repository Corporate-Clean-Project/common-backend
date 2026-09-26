const nodemailer = require('nodemailer');

/**
 * Lazily-created nodemailer transport. In local/dev environments
 * with dummy SMTP credentials, sends are logged instead of thrown
 * so the rest of the app keeps working without real credentials.
 */
let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || 'no-reply@toppristine.com';
  try {
    const info = await getTransporter().sendMail({ from, to, subject, html, text });
    return info;
  } catch (err) {
    // Never let a failed dummy-SMTP send crash the request in dev.
    console.warn(`[mailer] Failed to send email to ${to}: ${err.message}`);
    if (process.env.NODE_ENV === 'production') throw err;
    return { simulated: true, to, subject };
  }
}

module.exports = { sendMail, getTransporter };
