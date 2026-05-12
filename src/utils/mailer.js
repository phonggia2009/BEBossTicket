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
// const dns = require('dns');
// dns.setDefaultResultOrder('ipv4first');

// const nodemailer = require('nodemailer');
 
 
// exports.sendEmail = async (to, subject, html, attachments = []) => {
//   const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com', 
//     port: 587,
//     secure: false,  
//     requireTLS: true,       
//     family: 4,              
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS,
//     },
//   });
 
//   const mailOptions = {
//     from: '"BossTicket Support" <no-reply@bossticket.com>',
//     to: to,
//     subject: subject,
//     html: html,
//     attachments
//   };
 
//   return await transporter.sendMail(mailOptions);
// };
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendEmail = async (to, subject, html, attachments = []) => {
  const formattedAttachments = attachments.map(att => ({
    filename: att.filename,
    content: att.content,      // Buffer được hỗ trợ trực tiếp
  }));

  const { data, error } = await resend.emails.send({
    from: 'BossTicket <onboarding@resend.dev>',
    to,
    subject,
    html,
    attachments: formattedAttachments,
  });

  if (error) throw new Error(error.message);
  return data;
};