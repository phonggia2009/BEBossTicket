require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  family: 4,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});
console.log(process.env.SMTP_USER);
console.log(process.env.SMTP_PASS);
/**
 * Kiểm tra SMTP khi server start
 */
transporter.verify((error, success) => {
  if (error) {
    console.log("SMTP ERROR:");
    console.log(error);
  } else {
    console.log("SMTP SERVER READY");
  }
});

const sendEmail = async (
  to,
  subject,
  html,
  attachments = []
) => {
  try {
    const mailOptions = {
      from: `"BossTicket Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);

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