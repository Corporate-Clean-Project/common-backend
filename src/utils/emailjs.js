const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

async function sendInvitationEmail({ to, name, role, temporaryPassword }) {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_INVITE_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY,
  } = process.env;
  const missing = [
    ['EMAILJS_SERVICE_ID', EMAILJS_SERVICE_ID],
    ['EMAILJS_INVITE_TEMPLATE_ID', EMAILJS_INVITE_TEMPLATE_ID],
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
      template_id: EMAILJS_INVITE_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: to,
        to_name: name,
        name,
        role,
        temporary_password: temporaryPassword,
        app_name: 'Top Pristine Admin Workspace',
      },
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`EmailJS invitation email failed with status ${response.status}${detail ? `: ${detail}` : ''}`);
  }
}

module.exports = { sendInvitationEmail };
