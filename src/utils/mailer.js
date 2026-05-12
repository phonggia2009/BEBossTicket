require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,

  tls: {
    family: 4,
    rejectUnauthorized: false,
  },

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
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
  return await transporter.sendMail({
    from: `"BossTicket Support" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments,
  });
};

module.exports = {
  sendEmail,
};