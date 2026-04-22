const nodemailer = require("nodemailer");

function getTransportOptions() {
  const service = process.env.MAIL_SERVICE;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  if (service) {
    return {
      service,
      auth: {
        user,
        pass,
      },
    };
  }

  if (!process.env.MAIL_HOST || !process.env.MAIL_PORT) {
    return null;
  }

  return {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user,
      pass,
    },
  };
}

function isMailerConfigured() {
  return Boolean(getTransportOptions());
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const transportOptions = getTransportOptions();

    if (!transportOptions) {
      return null;
    }

    transporter = nodemailer.createTransport(transportOptions);
  }

  return transporter;
}

function getFromAddress() {
  return process.env.MAIL_FROM || process.env.MAIL_USER || "";
}

module.exports = {
  getFromAddress,
  getTransporter,
  isMailerConfigured,
};
