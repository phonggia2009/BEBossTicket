// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: process.env.MAIL_HOST,
//   port: process.env.MAIL_PORT,
//   auth: {
//     user: process.env.MAIL_USER,
//     pass: process.env.MAIL_PASS,
//   },
// });

// exports.sendEmail = async (to, subject, html) => {
//   const mailOptions = {
//     from: `Cinema Việt <${process.env.MAIL_FROM}>`,
//     to,
//     subject,
//     html,
//   };
//   return await transporter.sendMail(mailOptions);
// };
const nodemailer = require('nodemailer');


exports.sendEmail = async (to, subject, html, attachments = []) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.SMTP_USER, // Hãy chắc chắn biến môi trường trên Render của bạn tên là SMTP_USER
      pass: process.env.SMTP_PASS, // Và SMTP_PASS
    },
  });

  const mailOptions = {
    from: '"BossTicket Support" <no-reply@bossticket.com>',
    to: to,           // Truyền tham số to vào đây
    subject: subject, // Truyền tham số subject vào đây
    html: html,       // Truyền tham số html vào đây
    attachments
  };

  // Trả về kết quả gửi mail
  return await transporter.sendMail(mailOptions);
};