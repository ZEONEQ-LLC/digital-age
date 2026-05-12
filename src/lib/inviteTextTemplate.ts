export type InviteMessageInput = {
  recipientName: string;
  inviterName: string;
  inviteUrl: string;
  intendedRole: "author" | "editor";
};

// Generiert einen kompletten Einladungstext zum Versand via WhatsApp / Slack /
// eigene Mail. Der Editor kopiert den Text und versendet ihn manuell —
// Resend/SMTP-Integration kommt in eigener Session.
export function buildInviteMessage(opts: InviteMessageInput): string {
  const firstName = opts.recipientName.trim().split(/\s+/)[0] || opts.recipientName.trim();
  const roleLabel = opts.intendedRole === "editor" ? "Editor" : "Autor";
  return `Hallo ${firstName},

ich lade dich ein, ${roleLabel} bei digital-age.ch zu werden — dem Magazin für KI und Future Tech in der DACH-Region.

Über diesen Link kannst du dich registrieren:
${opts.inviteUrl}

Der Link ist 14 Tage gültig.

Bei Fragen einfach melden.

${opts.inviterName}`;
}
