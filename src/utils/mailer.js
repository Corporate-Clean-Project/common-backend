const { sendTransactionalEmail } = require('./emailjs');

async function sendMail({ to, subject, html, text }) {
  try {
    await sendTransactionalEmail({ to, subject, html, text });
    return { accepted: [to] };
  } catch (err) {
    console.warn(`[mailer] Failed to send email to ${to}: ${err.message}`);
    if (process.env.NODE_ENV === 'production') throw err;
    return { simulated: true, to, subject };
  }
}

module.exports = { sendMail };
