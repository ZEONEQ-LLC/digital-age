import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";
import { render } from "@react-email/render";
import PromptApproved, {
  SUBJECT_PREFIX as PROMPT_APPROVED_SUBJECT_PREFIX,
} from "@/emails/PromptApproved";
import PromptRejected, {
  SUBJECT as PROMPT_REJECTED_SUBJECT,
} from "@/emails/PromptRejected";
import PromptSubmissionConfirmation, {
  SUBJECT as PROMPT_CONFIRMATION_SUBJECT,
} from "@/emails/PromptSubmissionConfirmation";
import StartupApproved, {
  SUBJECT_PREFIX as STARTUP_APPROVED_SUBJECT_PREFIX,
} from "@/emails/StartupApproved";
import StartupRejected, {
  SUBJECT as STARTUP_REJECTED_SUBJECT,
} from "@/emails/StartupRejected";
import StartupSubmissionConfirmation, {
  SUBJECT as STARTUP_CONFIRMATION_SUBJECT,
} from "@/emails/StartupSubmissionConfirmation";
import SubmissionNotification, {
  buildSubject as buildNotificationSubject,
} from "@/emails/SubmissionNotification";
import { SITE_URL } from "@/lib/newsletter/mail";

export type SubmissionType = "prompt" | "startup";

type SendResult = { ok: true } | { ok: false; error: string };

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromEmail(): string | null {
  return process.env.NEWSLETTER_FROM_EMAIL ?? null;
}

function getEditorEmail(): string | null {
  // Editor-Notification-Ziel: dieselbe Adresse wie der Reply-To-Header der
  // anderen Mails. Pragmatische Wiederverwendung — Spec lässt das so zu.
  return process.env.NEWSLETTER_REPLY_TO ?? null;
}

function getReplyToDefault(): string | undefined {
  return process.env.NEWSLETTER_REPLY_TO ?? undefined;
}

async function renderAndSend(args: {
  to: string;
  replyTo?: string;
  subject: string;
  element: ReactElement;
  context: string;
}): Promise<SendResult> {
  const resend = getResend();
  const from = getFromEmail();
  if (!resend || !from) {
    console.error(
      `[submissions:${args.context}] RESEND_API_KEY oder NEWSLETTER_FROM_EMAIL fehlt`,
    );
    return { ok: false, error: "mail provider not configured" };
  }
  try {
    const html = await render(args.element);
    const result = await resend.emails.send({
      from,
      replyTo: args.replyTo,
      to: args.to,
      subject: args.subject,
      html,
    });
    if (result.error) {
      console.error(
        `[submissions:${args.context}] resend error:`,
        result.error,
      );
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      `[submissions:${args.context}] mail render or send failed:`,
      err,
    );
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ---------------------------------------------------------------------------
// Confirmation: an Submitter, direkt nach DB-Insert
// ---------------------------------------------------------------------------
export async function sendSubmissionConfirmation(args: {
  type: SubmissionType;
  email: string;
  name: string;
  title: string;
}): Promise<SendResult> {
  if (args.type === "prompt") {
    return renderAndSend({
      to: args.email,
      replyTo: getReplyToDefault(),
      subject: PROMPT_CONFIRMATION_SUBJECT,
      element: PromptSubmissionConfirmation({
        name: args.name,
        title: args.title,
      }),
      context: "prompt-confirmation",
    });
  }
  return renderAndSend({
    to: args.email,
    replyTo: getReplyToDefault(),
    subject: STARTUP_CONFIRMATION_SUBJECT,
    element: StartupSubmissionConfirmation({
      name: args.name,
      startupName: args.title,
    }),
    context: "startup-confirmation",
  });
}

// ---------------------------------------------------------------------------
// Notification: an Editor, direkt nach DB-Insert. Reply-To = Submitter
// damit der Editor mit einem Klick antworten kann.
// ---------------------------------------------------------------------------
export async function sendSubmissionNotification(args: {
  type: SubmissionType;
  title: string;
  submitterName: string;
  submitterEmail: string;
}): Promise<SendResult> {
  const editor = getEditorEmail();
  if (!editor) {
    console.error("[submissions] NEWSLETTER_REPLY_TO env not set");
    return { ok: false, error: "editor recipient not configured" };
  }
  const adminPath =
    args.type === "prompt" ? "/autor/admin/prompts" : "/autor/admin/startups";
  return renderAndSend({
    to: editor,
    replyTo: args.submitterEmail,
    subject: buildNotificationSubject(args.type, args.title),
    element: SubmissionNotification({
      type: args.type,
      title: args.title,
      submitterName: args.submitterName,
      submitterEmail: args.submitterEmail,
      adminUrl: `${SITE_URL}${adminPath}`,
    }),
    context: `${args.type}-notification`,
  });
}

// ---------------------------------------------------------------------------
// Approval: an Submitter, nachdem Editor approved hat. Live-URL absolut.
// ---------------------------------------------------------------------------
export async function sendSubmissionApproved(args: {
  type: SubmissionType;
  email: string;
  name: string;
  title: string;
  liveUrl: string; // relativer Pfad, SITE_URL wird hier geprefixt
}): Promise<SendResult> {
  const absoluteUrl = args.liveUrl.startsWith("http")
    ? args.liveUrl
    : `${SITE_URL}${args.liveUrl}`;

  if (args.type === "prompt") {
    return renderAndSend({
      to: args.email,
      replyTo: getReplyToDefault(),
      subject: `${PROMPT_APPROVED_SUBJECT_PREFIX}: ${args.title}`,
      element: PromptApproved({
        name: args.name,
        title: args.title,
        liveUrl: absoluteUrl,
      }),
      context: "prompt-approved",
    });
  }
  return renderAndSend({
    to: args.email,
    replyTo: getReplyToDefault(),
    subject: `${STARTUP_APPROVED_SUBJECT_PREFIX}: ${args.title}`,
    element: StartupApproved({
      name: args.name,
      startupName: args.title,
      liveUrl: absoluteUrl,
    }),
    context: "startup-approved",
  });
}

// ---------------------------------------------------------------------------
// Rejection: an Submitter, nachdem Editor rejected hat. Optional mit
// rejection_reason inline in HintBox; bei leerem reason generic-text.
// ---------------------------------------------------------------------------
export async function sendSubmissionRejected(args: {
  type: SubmissionType;
  email: string;
  name: string;
  title: string;
  reason?: string | null;
}): Promise<SendResult> {
  if (args.type === "prompt") {
    return renderAndSend({
      to: args.email,
      replyTo: getReplyToDefault(),
      subject: PROMPT_REJECTED_SUBJECT,
      element: PromptRejected({
        name: args.name,
        title: args.title,
        reason: args.reason ?? null,
      }),
      context: "prompt-rejected",
    });
  }
  return renderAndSend({
    to: args.email,
    replyTo: getReplyToDefault(),
    subject: STARTUP_REJECTED_SUBJECT,
    element: StartupRejected({
      name: args.name,
      startupName: args.title,
      reason: args.reason ?? null,
    }),
    context: "startup-rejected",
  });
}
