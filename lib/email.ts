import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_NAME = process.env.SMTP_FROM_NAME || 'VinPOS';
const FROM_EMAIL = process.env.SMTP_USER || 'noreply@vinpos.com';

export async function sendVerificationEmail(email: string, code: string, name: string) {
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Xác thực email - VinPOS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">VinPOS</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">Xác thực tài khoản</p>
          </div>
          <div style="padding:32px 24px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Xin chào ${name}!</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Cảm ơn bạn đã đăng ký tài khoản VinPOS. Đây là mã xác thực của bạn:
            </p>
            <div style="text-align:center;margin:24px 0;">
              <div style="display:inline-block;background:#f1f5f9;border:2px dashed #2563eb;border-radius:12px;padding:16px 40px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1e293b;">${code}</span>
              </div>
            </div>
            <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;">
              Mã xác thực có hiệu lực trong <strong>15 phút</strong>.<br>
              Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, code: string, name: string) {
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Đặt lại mật khẩu - VinPOS',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#ea580c,#dc2626);padding:32px 24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">VinPOS</h1>
            <p style="color:#fed7aa;margin:4px 0 0;font-size:14px;">Đặt lại mật khẩu</p>
          </div>
          <div style="padding:32px 24px;">
            <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Xin chào ${name}!</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Đây là mã xác thực:
            </p>
            <div style="text-align:center;margin:24px 0;">
              <div style="display:inline-block;background:#fef2f2;border:2px dashed #dc2626;border-radius:12px;padding:16px 40px;">
                <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1e293b;">${code}</span>
              </div>
            </div>
            <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;">
              Mã có hiệu lực trong <strong>15 phút</strong>.<br>
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
