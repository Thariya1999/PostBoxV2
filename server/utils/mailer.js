const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
const port = Number(process.env.SMTP_PORT || 465);
const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

exports.mailerStatus = async () => {
  if (!transporter) {
    console.log('Email: SMTP not configured. Emails will be printed here instead of sent.');
    return;
  }
  try {
    await transporter.verify();
    console.log(`Email: connected to ${SMTP_HOST} as ${SMTP_USER}`);
  } catch (err) {
    console.error('Email: could not connect to the SMTP server:', err.message);
  }
};

exports.sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    console.log(`\n--- EMAIL (not sent, SMTP not configured) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------------\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || `"Postbox" <${SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
