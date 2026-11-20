import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  recipientName?: string;
  message: string;
  senderName?: string;
  actionUrl?: string;
  actionText?: string;
}

export interface EmailSendResult {
  success: boolean;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  failedEmails: string[];
  error?: string;
}

// Create Nodemailer Transporter using Gmail SMTP
export function getEmailTransporter() {
  const email = process.env.SMTP_EMAIL || 'farziemailhaiyemera@gmail.com';
  const pass = (process.env.SMTP_APP_PASSWORD || 'ztxyfxwegsbwkjir').replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: pass
    }
  });
}

// Generate Hisaabdo-Themed HTML Email Template
export function generateHisaabdoEmailHtml(options: {
  recipientName: string;
  subject: string;
  message: string;
  senderName?: string;
  actionUrl?: string;
  actionText?: string;
}): string {
  const { recipientName, subject, message, senderName = 'Hardik (Hisaabdo Admin)', actionUrl = 'https://hisabdo.vercel.app', actionText = 'Open Hisaabdo' } = options;

  // Convert plain text newlines into clean paragraph breaks
  const formattedMessage = message
    .split(/\n{2,}/)
    .map(para => `<p style="margin: 0 0 16px 0; line-height: 1.7; font-size: 15px; color: #334155;">${para.replace(/\n/g, '<br />')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04); border: 1px solid #e2e8f0;">
          
          <!-- Emerald Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%); padding: 32px 32px 28px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px; color: #ffffff; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      💸
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Hisaabdo</h1>
                    <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500;">Group bills & smart direct debt solver</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; background-color: #ffffff;">
              <!-- Admin Official Tag -->
              <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px;">
                Official Announcement
              </div>

              <!-- Subject Title -->
              <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3; letter-spacing: -0.3px;">
                ${escapeHtml(subject)}
              </h2>

              <!-- Greeting -->
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1e293b;">
                Hello ${escapeHtml(recipientName)},
              </p>

              <!-- Message Body Box -->
              <div style="background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 0 12px 12px 0; padding: 20px; margin: 20px 0 28px 0;">
                ${formattedMessage}
              </div>

              <!-- Call to Action Button -->
              ${actionUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: #059669;">
                    <a href="${actionUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; display: inline-block; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                      ${escapeHtml(actionText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Sign-off -->
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                  Warm regards,<br />
                  <strong style="color: #0f172a; font-size: 14px;">${escapeHtml(senderName)}</strong><br />
                  <span style="font-size: 12px; color: #94a3b8;">Hisaabdo Admin & Core Team</span>
                </p>
              </div>
            </td>
          </tr>

          <!-- Modern Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 500;">
                You received this email because you are a registered member of Hisaabdo.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Hisaabdo. All rights reserved. &bull; Transparent Group Finance
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Send Email to one or multiple recipients
export async function sendHisaabdoEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const transporter = getEmailTransporter();
  const fromEmail = process.env.SMTP_EMAIL || 'farziemailhaiyemera@gmail.com';
  const fromName = process.env.SMTP_SENDER_NAME || 'Hisaabdo';
  const fromAddress = `"${fromName}" <${fromEmail}>`;

  const rawRecipients = Array.isArray(options.to) ? options.to : [options.to];
  // Filter out any dummy local emails (e.g. user_xxx@hisaabdo.local) and empty strings
  const validRecipients = rawRecipients
    .map(e => (e || '').trim().toLowerCase())
    .filter(e => e.includes('@') && !e.includes('@hisaabdo.local'));

  if (validRecipients.length === 0) {
    return {
      success: false,
      totalRecipients: rawRecipients.length,
      sentCount: 0,
      failedCount: rawRecipients.length,
      failedEmails: rawRecipients,
      error: 'No valid recipient email addresses found (dummy @hisaabdo.local addresses were excluded).'
    };
  }

  let sentCount = 0;
  const failedEmails: string[] = [];

  // Send individually to personalize and protect recipient privacy (no BCC leakage)
  for (const recipient of validRecipients) {
    try {
      const html = generateHisaabdoEmailHtml({
        recipientName: options.recipientName || recipient.split('@')[0],
        subject: options.subject,
        message: options.message,
        senderName: options.senderName || 'Hardik (Hisaabdo Admin)',
        actionUrl: options.actionUrl,
        actionText: options.actionText
      });

      await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject: options.subject,
        text: `${options.subject}\n\n${options.message}\n\n---\nSent by Hisaabdo Admin`,
        html: html
      });

      sentCount++;
    } catch (err: any) {
      console.error(`Failed to send email to ${recipient}:`, err?.message || err);
      failedEmails.push(recipient);
    }
  }

  return {
    success: sentCount > 0,
    totalRecipients: validRecipients.length,
    sentCount,
    failedCount: failedEmails.length,
    failedEmails,
    error: failedEmails.length > 0 ? `Failed to deliver to ${failedEmails.length} recipient(s)` : undefined
  };
}
