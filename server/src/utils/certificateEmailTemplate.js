/**
 * Generates personalized email subject, HTML, and plain text content for a certificate.
 *
 * @param {Object} certificate
 * @returns {{ subject: string, html: string, text: string }}
 */
export const generateCertificateEmailContent = (certificate = {}) => {
  const participantName = (certificate.participantName || "Participant").trim();
  const eventName = (certificate.eventName || "Event").trim();
  const certificateTitle = (certificate.certificateTitle || "Certificate of Participation").trim();
  const certificateCategory = (certificate.certificateCategory || "Participation").trim();
  const organizationName = (certificate.organizationName || "Event Organization").trim();
  const eventDate = certificate.eventDate ? new Date(certificate.eventDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) : "";

  const subject = `Your Certificate – ${certificateTitle}`;

  const text = [
    `Dear ${participantName},`,
    "",
    `Your certificate for ${eventName} is attached to this email.`,
    "",
    `Certificate: ${certificateTitle}`,
    `Category: ${certificateCategory}`,
    `Organization: ${organizationName}`,
    eventDate ? `Date: ${eventDate}` : "",
    "",
    "Regards,",
    "Event Document Generator"
  ].filter(Boolean).join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${certificateTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${certificateTitle}</h1>
                  <p style="margin: 6px 0 0 0; color: #dbeafe; font-size: 14px; font-weight: 500;">${organizationName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px 24px;">
                  <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                    Dear <strong>${participantName}</strong>,
                  </p>
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                    Your official certificate for <strong>${eventName}</strong> is attached to this email as a high-resolution PDF document.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Event:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${eventName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Category:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${certificateCategory}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Organization:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${organizationName}</td>
                    </tr>
                    ${eventDate ? `
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Date:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${eventDate}</td>
                    </tr>` : ""}
                  </table>

                  <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                    Please find the PDF attachment below. Keep it for your records.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                    Generated and sent via <strong>Event Document Generator</strong>
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

  return { subject, html, text };
};

export default generateCertificateEmailContent;
