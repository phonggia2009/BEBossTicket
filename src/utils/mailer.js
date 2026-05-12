require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  tls: {
    rejectUnauthorized: false,
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
  return await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
    attachments,
  });
};

module.exports = {
  sendEmail,
};