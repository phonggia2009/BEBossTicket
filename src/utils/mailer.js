const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

exports.sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `Cinema Việt <${process.env.MAIL_FROM}>`,
    to,
    subject,
    html,
  };
  return await transporter.sendMail(mailOptions);
};