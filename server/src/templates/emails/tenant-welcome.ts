/**
 * Tenant Welcome Email Template
 * Sent when a new tenant is created
 * Includes password setup link
 */

export interface TenantWelcomeEmailData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  setupLink: string;
  adminName: string;
  platformName: string;
}

export function generateTenantWelcomeEmail(data: TenantWelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { companyName, contactName, setupLink, platformName } = data;

  const subject = `Willkommen bei ${platformName} - Jetzt Zugang einrichten`;

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei ${platformName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                ${platformName}
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                Security Management System
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
                Willkommen, ${contactName}!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Ihr Account für <strong>${companyName}</strong> wurde erfolgreich eingerichtet.
              </p>

              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Um loszulegen, müssen Sie nur noch Ihr persönliches Passwort festlegen:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${setupLink}" 
                       style="display: inline-block; padding: 20px 60px; background-color: #1e40af; color: #ffffff; text-decoration: none; font-size: 20px; font-weight: bold; border-radius: 12px; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.3);">
                      🔐 Passwort wählen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Hinweis:</strong> Dieser Link ist 24 Stunden gültig. Nach Ablauf können Sie einen neuen Link anfordern.
              </p>

              <!-- Features Preview -->
              <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 18px;">
                      Das erwartet Sie:
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                      <li>✅ Mitarbeiterverwaltung</li>
                      <li>✅ Kunden- und Objektverwaltung</li>
                      <li>✅ Intelligente Dienstplanung mit KI</li>
                      <li>✅ Zeiterfassung & Abrechnung</li>
                      <li>✅ Echtzeit-Berichte & Dashboards</li>
                      <li>✅ DATEV-Export (Premium Add-on)</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Bei Fragen stehen wir Ihnen gerne zur Verfügung.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Mit freundlichen Grüßen,<br>
                <strong>Ihr ${platformName} Team</strong>
              </p>
              <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px;">
                © 2026 ${platformName}. Alle Rechte vorbehalten.<br>
                Diese E-Mail wurde automatisch generiert.
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

  const text = `
Willkommen bei ${platformName}!

Hallo ${contactName},

Ihr Account für ${companyName} wurde erfolgreich eingerichtet.

Um loszulegen, rufen Sie bitte folgenden Link auf und legen Ihr Passwort fest:
${setupLink}

Dieser Link ist 24 Stunden gültig.

Das erwartet Sie:
- Mitarbeiterverwaltung
- Kunden- und Objektverwaltung
- Intelligente Dienstplanung mit KI
- Zeiterfassung & Abrechnung
- Echtzeit-Berichte & Dashboards
- DATEV-Export (Premium Add-on)

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Ihr ${platformName} Team

---
© 2026 ${platformName}. Alle Rechte vorbehalten.
  `;

  return { subject, html, text };
}
