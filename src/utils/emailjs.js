const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

async function sendTemplateEmail(templateId, templateIdName, templateParams) {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY,
  } = process.env;
  const missing = [
    ['EMAILJS_SERVICE_ID', EMAILJS_SERVICE_ID],
    [templateIdName, templateId],
    ['EMAILJS_PUBLIC_KEY', EMAILJS_PUBLIC_KEY],
    ['EMAILJS_PRIVATE_KEY', EMAILJS_PRIVATE_KEY],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Error(`EmailJS is not configured; missing ${missing.map(([key]) => key).join(', ')}`);
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`EmailJS email failed with status ${response.status}${detail ? `: ${detail}` : ''}`);
  }
}

async function sendInvitationEmail({ to, name, role, temporaryPassword }) {
  await sendTemplateEmail(
    process.env.EMAILJS_INVITE_TEMPLATE_ID,
    'EMAILJS_INVITE_TEMPLATE_ID',
    {
      to_email: to,
      to_name: name,
      name,
      role,
      temporary_password: temporaryPassword,
      app_name: 'Pristine Admin Workspace',
    },
  );
}

async function sendTransactionalEmail({ to, subject, html, text }) {
  await sendTemplateEmail(
    process.env.EMAILJS_MAIL_TEMPLATE_ID,
    'EMAILJS_MAIL_TEMPLATE_ID',
    {
      to_email: to,
      subject,
      message_html: html || '',
      message_text: text || '',
    },
  );
}

module.exports = { sendInvitationEmail, sendTransactionalEmail };
