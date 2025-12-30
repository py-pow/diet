import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.EMAIL_FROM || 'noreply@diet.com'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  subdomain: string
) {
  const loginUrl = `https://${subdomain}.${new URL(appUrl).hostname}/login`

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Diet SaaS\'a Hoş Geldiniz!',
      html: `
        <h1>Merhaba ${name},</h1>
        <p>Diet SaaS'a hoş geldiniz! Hesabınız başarıyla oluşturuldu.</p>
        <p>Giriş yapmak için: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>Deneme süreniz 14 gün boyunca geçerlidir.</p>
        <p>İyi günler dileriz!</p>
      `,
    })
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

/**
 * Send email verification
 */
export async function sendEmailVerification(
  to: string,
  name: string,
  token: string
) {
  const verifyUrl = `${appUrl}/auth/verify-email?token=${token}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Email Adresinizi Doğrulayın',
      html: `
        <h1>Merhaba ${name},</h1>
        <p>Email adresinizi doğrulamak için aşağıdaki linke tıklayın:</p>
        <p><a href="${verifyUrl}">Email Adresimi Doğrula</a></p>
        <p>Bu link 24 saat geçerlidir.</p>
      `,
    })
  } catch (error) {
    console.error('Error sending email verification:', error)
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
) {
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Şifre Sıfırlama Talebi',
      html: `
        <h1>Merhaba ${name},</h1>
        <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
        <p><a href="${resetUrl}">Şifremi Sıfırla</a></p>
        <p>Bu link 1 saat geçerlidir.</p>
        <p>Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
      `,
    })
  } catch (error) {
    console.error('Error sending password reset email:', error)
  }
}

/**
 * Send user invitation email
 */
export async function sendUserInvitationEmail(
  to: string,
  firstName: string,
  inviterName: string,
  organizationName: string,
  role: string,
  temporaryPassword: string
) {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: `${organizationName} - Davetiye`,
      html: `
        <h1>Merhaba ${firstName},</h1>
        <p>${inviterName} sizi ${organizationName} organizasyonuna ${role} olarak davet etti.</p>
        <p>Geçici şifreniz: <strong>${temporaryPassword}</strong></p>
        <p>Giriş yaptıktan sonra lütfen şifrenizi değiştirin.</p>
        <p><a href="${appUrl}/login">Giriş Yap</a></p>
      `,
    })
  } catch (error) {
    console.error('Error sending user invitation email:', error)
  }
}

/**
 * Send appointment reminder
 */
export async function sendAppointmentReminder(
  to: string,
  patientName: string,
  appointmentTitle: string,
  appointmentDate: Date,
  dietitianName: string
) {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Randevu Hatırlatması',
      html: `
        <h1>Merhaba ${patientName},</h1>
        <p>Yarın saat ${appointmentDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} randevunuz var.</p>
        <p><strong>${appointmentTitle}</strong></p>
        <p>Diyetisyen: ${dietitianName}</p>
        <p>Görüşmek üzere!</p>
      `,
    })
  } catch (error) {
    console.error('Error sending appointment reminder:', error)
  }
}
