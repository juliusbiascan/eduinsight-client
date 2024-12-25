import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';


export async function sendOtpCodeEmail(
  email: string,
  otp: string,
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'eduinsight.smhs@gmail.com',
        pass: 'gdxq mxxu cadx mltd',
      },
    });

    const mailOptions :  Mail.Options = {
      from: '"EduInsight" <eduinsight.smhs@gmail.com>',
      to: email,
      subject: 'Your OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Dear User,</p>
          <p>You have requested to reset your password. Please use the OTP below to proceed:</p>
          <div style="background-color: #f2f2f2; padding: 20px; text-align: center; margin: 20px 0;">
            <h3 style="color: #C9121F;">${otp}</h3>
          </div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
          <br>
          <p>Best regards,<br/>Your Support Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}
