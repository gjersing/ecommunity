"use strict";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: "k6wk4v6sph3p2zjh@ethereal.email",
    pass: "Jww6jrx5yy62YengQK",
  },
});

export async function sendEmail(to: string, html: string) {
  // send mail with defined transport object
  // TO DO: setup official mailer from domain
  const info = await transporter.sendMail({
    from: '"Account Services" <noreply@ecommunity.us>',
    to: to,
    subject: "Ecommunity - Password Reset",
    html,
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
