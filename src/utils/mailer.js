require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:");
    console.log(error);
  } else {
    console.log("SMTP READY");
  }
});

const sendEmail = async (
  to,
  subject,
  html,
  attachments = []
) => {
  try {
    const info = await transporter.sendMail({
      from: `"BossTicket Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });

    console.log("MAIL SENT:", info.messageId);

    return info;
  } catch (error) {
    console.log("SEND MAIL ERROR:");
    console.log(error);

    throw error;
  }
};

module.exports = {
  sendEmail,
};