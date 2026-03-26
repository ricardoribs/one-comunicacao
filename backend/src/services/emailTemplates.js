function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "http://localhost:3000").replace(/\/+$/, "");
}

function buildShell({
  appBaseUrl,
  previewText,
  eyebrow,
  title,
  intro,
  actionLabel,
  actionUrl,
  actionNote,
  supportText,
  fallbackLabel,
}) {
  const baseUrl = normalizeBaseUrl(appBaseUrl);
  const logoUrl = `${baseUrl}/assets/svg/one-logo-dark.svg`;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f1eb;color:#17171b;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${escapeHtml(previewText)}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f1eb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;background:#ffffff;border:1px solid #e8e1d8;">
            <tr>
              <td style="padding:28px 32px 18px;border-bottom:1px solid #efe8df;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <img src="${escapeHtml(logoUrl)}" alt="ONE Comunicacao Integrada" width="122" style="display:block;border:0;max-width:122px;height:auto;" />
                    </td>
                    <td align="right" style="vertical-align:middle;font-size:11px;line-height:1.4;letter-spacing:.18em;text-transform:uppercase;color:#e83469;font-weight:700;">
                      ${escapeHtml(eyebrow)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 24px;">
                <div style="font-size:13px;line-height:1.5;letter-spacing:.16em;text-transform:uppercase;color:#e83469;font-weight:700;margin-bottom:16px;">
                  Painel ONE
                </div>
                <h1 style="margin:0 0 16px;font-size:34px;line-height:1.08;color:#17171b;font-weight:800;">
                  ${escapeHtml(title)}
                </h1>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.7;color:#5f5a53;">
                  ${escapeHtml(intro)}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#e83469" style="border-radius:999px;">
                      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:15px 28px;font-size:12px;line-height:1.2;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                        ${escapeHtml(actionLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
                <div style="margin-top:24px;padding:18px 20px;background:#fbf7f2;border:1px solid #efe8df;">
                  <p style="margin:0;font-size:14px;line-height:1.7;color:#5f5a53;">
                    ${escapeHtml(actionNote)}
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <div style="padding:20px 0 0;border-top:1px solid #efe8df;">
                  <p style="margin:0 0 8px;font-size:12px;line-height:1.6;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8c867e;">
                    ${escapeHtml(fallbackLabel)}
                  </p>
                  <p style="margin:0 0 18px;font-size:14px;line-height:1.7;word-break:break-word;color:#5f5a53;">
                    <a href="${escapeHtml(actionUrl)}" style="color:#17171b;text-decoration:underline;">${escapeHtml(actionUrl)}</a>
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.7;color:#7a756d;">
                    ${escapeHtml(supportText)}
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 26px;background:#17171b;color:#ffffff;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;font-weight:700;">
                  ONE Comunicacao Integrada
                </p>
                <p style="margin:0;font-size:12px;line-height:1.7;color:rgba(255,255,255,.72);">
                  Este e-mail foi enviado automaticamente pela plataforma ONE. ${currentYear}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildVerificationEmail({ appBaseUrl, userName, verifyUrl }) {
  return buildShell({
    appBaseUrl,
    previewText: "Confirme seu cadastro e ative seu acesso na plataforma ONE.",
    eyebrow: "Verificacao de acesso",
    title: "Confirme seu e-mail",
    intro: `Ola, ${userName}. Para ativar seu acesso ao ambiente da ONE, confirme o endereco de e-mail clicando no botao abaixo.`,
    actionLabel: "Confirmar e-mail",
    actionUrl: verifyUrl,
    actionNote: "Se voce nao solicitou este cadastro, ignore esta mensagem. Nenhuma alteracao sera feita sem a confirmacao do link.",
    supportText: "Se o botao nao abrir, copie o link acima e cole diretamente no navegador.",
    fallbackLabel: "Link direto",
  });
}

function buildPasswordResetEmail({ appBaseUrl, userName, resetUrl, expiresMinutes }) {
  return buildShell({
    appBaseUrl,
    previewText: "Redefina sua senha com seguranca na plataforma ONE.",
    eyebrow: "Recuperacao de senha",
    title: "Redefina sua senha",
    intro: `Ola, ${userName}. Recebemos uma solicitacao para redefinir a senha da sua conta. Use o botao abaixo para criar uma nova senha com seguranca.`,
    actionLabel: "Redefinir senha",
    actionUrl: resetUrl,
    actionNote: `Este link expira em ${expiresMinutes} minutos. Se voce nao solicitou a redefinicao, ignore este e-mail e sua senha atual permanecera valida.`,
    supportText: "Se o botao nao abrir, copie o link acima e cole diretamente no navegador.",
    fallbackLabel: "Link seguro",
  });
}

module.exports = {
  buildVerificationEmail,
  buildPasswordResetEmail,
};
