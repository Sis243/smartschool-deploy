// Gabarit HTML partagé pour les e-mails "système" (invitation, mot de passe...).
// Inline CSS uniquement — les clients mail ignorent les balises <style> externes.
export function buildEmailHtml(opts: {
  titre: string;
  etablissement?: string;
  paragraphes: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;
}) {
  const { titre, etablissement, paragraphes, ctaLabel, ctaUrl, note } = opts;
  const annee = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SmartSchool ERP</span>
              </div>
              ${etablissement ? `<div style="margin-top:4px;color:#bfdbfe;font-size:13px;">${etablissement}</div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:19px;color:#0f172a;">${titre}</h1>
              ${paragraphes.map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#334155;">${p}</p>`).join('')}
              ${
                ctaLabel && ctaUrl
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                      <tr><td style="border-radius:10px;background-color:#2563eb;">
                        <a href="${ctaUrl}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${ctaLabel}</a>
                      </td></tr>
                    </table>
                    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Ou copiez ce lien dans votre navigateur :<br/><a href="${ctaUrl}" style="color:#2563eb;">${ctaUrl}</a></p>`
                  : ''
              }
              ${note ? `<p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">${note}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">© ${annee} SmartSchool ERP — Créé par Smart IT Solution</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
