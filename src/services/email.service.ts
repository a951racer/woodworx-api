import sgMail from '@sendgrid/mail';
import env from '../config/env';

/**
 * Send a password reset email to the user.
 * In development mode, logs the reset link to console instead of sending.
 * Errors are logged but not thrown — the forgot-password endpoint should always return 200.
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;

  // In development, just log the details
  if (env.NODE_ENV === 'development') {
    console.log('--- Password Reset Email (dev mode) ---');
    console.log(`To: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('----------------------------------------');
    return;
  }

  try {
    sgMail.setApiKey(env.SENDGRID_API_KEY);

    await sgMail.send({
      to: email,
      from: env.EMAIL_FROM,
      subject: 'WoodworX — Password Reset Request',
      text: `You requested a password reset. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.`,
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
}
