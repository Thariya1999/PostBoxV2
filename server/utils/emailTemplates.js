const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ heading, intro, button, outro }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#eef1f7;padding:24px">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:28px;color:#131a2e">
<div style="font-weight:800;font-size:20px;margin-bottom:16px">Postbox</div>
<h1 style="font-size:20px;margin:0 0 12px">${esc(heading)}</h1>
<p style="line-height:1.6;margin:0">${intro}</p>
${button ? `<p style="margin:24px 0"><a href="${esc(button.url)}" style="background:#3454ff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>
<p style="font-size:12px;color:#5d6784;word-break:break-all;margin:0 0 16px">If the button doesn't work, copy this link into your browser:<br>${esc(button.url)}</p>` : ''}
${outro ? `<p style="font-size:13px;color:#5d6784;line-height:1.5;margin:0">${outro}</p>` : ''}
</div></div>`;
}

exports.verifyEmail = ({ name, url }) => ({
  subject: 'Verify your email for Postbox',
  text: `Hi ${name},\n\nConfirm your email address to activate your Postbox account:\n${url}\n\nThis link works for 24 hours. If you didn't create an account, ignore this email.`,
  html: layout({
    heading: 'Confirm your email address',
    intro: `Hi ${esc(name)}, confirm your email to activate your Postbox account.`,
    button: { label: 'Verify email', url },
    outro: "This link works for 24 hours. If you didn't create an account, you can ignore this email.",
  }),
});

exports.resetPassword = ({ name, url }) => ({
  subject: 'Reset your Postbox password',
  text: `Hi ${name},\n\nUse this link to choose a new password:\n${url}\n\nThis link works for 1 hour. If you didn't ask for this, ignore this email. Your password will not change.`,
  html: layout({
    heading: 'Reset your password',
    intro: `Hi ${esc(name)}, use the button below to choose a new password.`,
    button: { label: 'Choose a new password', url },
    outro: "This link works for 1 hour. If you didn't ask for this, ignore this email. Your password will not change.",
  }),
});

exports.passwordChanged = ({ name }) => ({
  subject: 'Your Postbox password was changed',
  text: `Hi ${name},\n\nYour Postbox password was just changed and you were logged out on other devices. If this wasn't you, reset your password right away.`,
  html: layout({
    heading: 'Your password was changed',
    intro: `Hi ${esc(name)}, your Postbox password was just changed and you were logged out on other devices.`,
    outro: "If this wasn't you, reset your password right away using \"Forgot password\" on the login page.",
  }),
});

exports.newMessage = ({ name, senderName, subject, url }) => ({
  subject: `New message from ${senderName}`,
  text: `Hi ${name},\n\n${senderName} sent you a message: "${subject}"\n\nLog in to read it:\n${url}`,
  html: layout({
    heading: `New message from ${senderName}`,
    intro: `Hi ${esc(name)}, <strong>${esc(senderName)}</strong> sent you a message:<br><em>${esc(subject)}</em>`,
    button: { label: 'Open message', url },
    outro: 'You can turn these emails off in Settings.',
  }),
});
