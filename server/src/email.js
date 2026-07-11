import nodemailer from 'nodemailer'
import { config } from './env.js'

const hasSmtp = !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS)

const transport = hasSmtp
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    })
  : null

export async function sendVerificationCode(email, code) {
  if (!transport) {
    console.log(`[email] verification code for ${email}: ${code}`)
    if (config.NODE_ENV === 'production') {
      console.warn('[email] SMTP not configured — code was not emailed.')
    }
    return
  }

  await transport.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It expires in ${config.CODE_TTL_MINUTES} minutes.`,
    html: `<div style="font-family:system-ui,sans-serif">
      <p>Your verification code is:</p>
      <p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p>
      <p style="color:#555">Expires in ${config.CODE_TTL_MINUTES} minutes.</p>
    </div>`,
  })
}
