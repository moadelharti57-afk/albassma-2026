import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
// @deno-types="npm:@types/nodemailer@6.4.17"
import nodemailer from "npm:nodemailer@6.9.16";
// @deno-types="npm:@types/qrcode@1.5.5"
import QRCode from "npm:qrcode@1.5.4";

// Tickets are sent from a Gmail account using a Google "app password".
// Set them with:
//   supabase secrets set GMAIL_USER=club.address@gmail.com
//   supabase secrets set GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
// Optional display name for the sender:
//   supabase secrets set MAIL_FROM_NAME="Albassma Film"
const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "";
const GMAIL_APP_PASSWORD = (Deno.env.get("GMAIL_APP_PASSWORD") ?? "").replace(/\s+/g, "");
const MAIL_FROM_NAME = Deno.env.get("MAIL_FROM_NAME") ?? "Albassma Film";
// Optional: the club inbox that gets a short notice for every new ticket
// ("X took a ticket at 18:32"). Leave unset to turn notices off.
//   supabase secrets set NOTIFY_EMAIL=albassmabillets@gmail.com
const NOTIFY_EMAIL = (Deno.env.get("NOTIFY_EMAIL") ?? "").trim();

// Supabase Edge Functions block outgoing ports 25 and 587, so use Gmail's
// implicit-TLS port 465.
// pool: keep the Gmail connection open between sends, and allow two at once
// (ticket + club notice) instead of a new TLS handshake for each email.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  pool: true,
  maxConnections: 2,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

// The service-role client can read participants despite row-level security.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Public address of the site, e.g. https://tickets.example.com
// Set it with: supabase secrets set SITE_URL=https://your-site
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

// Only send for tickets created this recently, so the endpoint can't be used
// to spam people with repeat emails.
const SEND_WINDOW_MINUTES = 15;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("GMAIL_USER / GMAIL_APP_PASSWORD secrets are not set");
    return json({ error: "Email sending is not configured" }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const ticketCode = typeof body?.ticketCode === "string"
      ? body.ticketCode.trim().toUpperCase()
      : "";

    if (!/^[A-Z0-9_-]{6,32}$/.test(ticketCode)) {
      return json({ error: "Invalid ticket code" }, 400);
    }

    // The recipient and name come from the database, never from the request.
    const { data: participant, error } = await admin
      .from("participants")
      .select("full_name, email, phone, registered_by, ticket_code, created_at")
      .eq("ticket_code", ticketCode)
      .maybeSingle();

    if (error) throw error;
    if (!participant) {
      return json({ error: "Ticket not found" }, 404);
    }

    const ageMinutes = (Date.now() - new Date(participant.created_at).getTime()) / 60000;
    if (ageMinutes > SEND_WINDOW_MINUTES) {
      return json({ error: "Ticket email can only be sent right after registration" }, 403);
    }

    const siteUrl = SITE_URL || (req.headers.get("origin") ?? "");
    const verifyUrl = `${siteUrl}/verify?ticket=${encodeURIComponent(participant.ticket_code)}`;
    // Link for the club notification: opens the admin page with the delete
    // confirmation for this ticket (sign-in required, nothing deleted on open).
    const deleteUrl = `${siteUrl}/admin/tickets?supprimer=${encodeURIComponent(participant.ticket_code)}`;
    // The QR code is generated here and attached inline (cid:), so the
    // ticket code is never sent to a third-party QR service.
    const qrPng: Uint8Array = await QRCode.toBuffer(verifyUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    const fullName = escapeHtml(participant.full_name);
    const code = escapeHtml(participant.ticket_code);
    const formattedDate = new Date(participant.created_at).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    console.log(`Sending ticket email for ticket ${participant.ticket_code}`);

    // Both emails are started at once and awaited together below, so the
    // participant's ticket and the club notice go out in parallel.
    const ticketSend = transporter.sendMail({
      from: { name: MAIL_FROM_NAME, address: GMAIL_USER },
      to: participant.email,
      subject: "Votre billet Albassma Film 2026",
      text:
        `Bonjour ${participant.full_name},\n\n` +
        `Merci pour votre inscription ! Votre billet numérique est prêt.\n\n` +
        `Code du billet : ${participant.ticket_code}\n` +
        `Votre billet : ${verifyUrl}\n\n` +
        `Présentez le QR code à l'entrée.\n\n` +
        `Mohandiss Al Bassma`,
      attachments: [
        {
          filename: `billet-${participant.ticket_code}.png`,
          content: qrPng,
          contentType: "image/png",
          cid: "ticket-qr",
        },
      ],
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #eaeaea; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #264653; border-radius: 16px; overflow: hidden;">
              <div style="background-color: #32b577; height: 8px;"></div><div style="background-color: #86de76; height: 3px;"></div>
              <div style="padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                  ALBASSMA FILM 2026
                </h1>
                <p style="color: #eaeaea; font-size: 14px; margin: 0 0 30px 0;">
                  Organisé par Mohandiss Al Bassma
                </p>
                <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: inline-block;">
                  <img src="cid:ticket-qr" alt="QR code du billet" width="200" height="200" style="display: block;" />
                </div>
                <div style="background-color: #000000; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <p style="color: #86de76; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                    Code du billet
                  </p>
                  <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">
                    ${code}
                  </p>
                </div>
                <div style="margin-bottom: 24px;">
                  <p style="color: #86de76; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">
                    Spectateur
                  </p>
                  <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">
                    ${fullName}
                  </p>
                </div>
                <p style="color: #eaeaea; font-size: 14px; margin: 0 0 24px 0;">
                  ${formattedDate}
                </p>
                <div style="border-top: 1px solid #32b577; padding-top: 24px;">
                  <p style="color: #eaeaea; font-size: 14px; margin: 0 0 16px 0;">
                    Merci pour votre inscription ! Votre billet numérique est prêt.
                  </p>
                  <p style="color: #86de76; font-size: 13px; margin: 0; font-weight: 500;">
                    📱 Présentez ce QR code à l'entrée
                  </p>
                </div>
              </div>
            </div>
            <p style="color: #264653; font-size: 12px; text-align: center; margin-top: 24px;">
              © ${new Date().getFullYear()} Mohandiss Al Bassma Club. Tous droits réservés.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    // Club notification. A failure here must not affect the participant.
    const notifySend = (async () => {
      if (!NOTIFY_EMAIL) return false;
      try {
        const when = new Date(participant.created_at).toLocaleString("fr-FR", {
          timeZone: "Africa/Casablanca",
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });
        const row = (label: string, value: string) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#264653;font-weight:600;">${label}</td>` +
          `<td style="padding:6px 0;color:#000;">${escapeHtml(value)}</td></tr>`;

        await transporter.sendMail({
          from: { name: MAIL_FROM_NAME, address: GMAIL_USER },
          to: NOTIFY_EMAIL,
          replyTo: participant.email,
          subject: `🎟️ Nouveau billet : ${participant.full_name} (${participant.ticket_code})`,
          text:
            `${participant.full_name} a pris un billet.\n\n` +
            `Email : ${participant.email}\n` +
            `Téléphone : ${participant.phone}\n` +
            `Invité par : ${participant.registered_by ?? "-"}\n` +
            `Code : ${participant.ticket_code}\n` +
            `Quand : ${when}\n\n` +
            `Supprimer ce billet : ${deleteUrl}\n`,
          html: `
            <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#eaeaea;">
              <div style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <div style="background:#32b577;height:6px;"></div>
                <div style="padding:20px 24px;">
                  <p style="margin:0 0 4px;color:#32b577;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Nouveau billet</p>
                  <h2 style="margin:0 0 16px;color:#000;font-size:20px;">${fullName} a pris un billet</h2>
                  <table style="border-collapse:collapse;font-size:14px;">
                    ${row("Email", participant.email)}
                    ${row("Téléphone", participant.phone)}
                    ${row("Invité par", participant.registered_by ?? "-")}
                    ${row("Code", participant.ticket_code)}
                    ${row("Quand", when)}
                  </table>
                  <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eaeaea;">
                    <a href="${deleteUrl}"
                       style="display:inline-block;background:#d93f3f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;">
                      🗑️ Supprimer ce billet
                    </a>
                    <p style="margin:10px 0 0;color:#264653;font-size:12px;">
                      Ouvre l'espace admin du site (connexion requise) et demande une confirmation avant de supprimer.
                    </p>
                  </div>
                </div>
              </div>
            </div>`,
        });
        return true;
      } catch (notifyError) {
        console.error("Club notification failed:", notifyError);
        return false;
      }
    })();

    const [info, notified] = await Promise.all([ticketSend, notifySend]);

    return json({ success: true, id: info.messageId ?? null, notified });
  } catch (error: unknown) {
    console.error("Error in send-ticket-email function:", error);
    return json({ error: "Could not send the ticket email" }, 500);
  }
};

serve(handler);
