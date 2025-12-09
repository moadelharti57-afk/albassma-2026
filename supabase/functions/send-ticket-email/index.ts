import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketEmailRequest {
  email: string;
  fullName: string;
  ticketCode: string;
  createdAt: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, ticketCode, createdAt }: TicketEmailRequest = await req.json();

    console.log(`Sending ticket email to ${email} for ticket ${ticketCode}`);

    const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate QR code URL using a free QR code API
    const verifyUrl = `https://quvhrkikcabyjepyavgb.supabase.co/functions/v1/verify?ticket=${ticketCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;

    const emailResponse = await resend.emails.send({
      from: "Albassma Filme <ticketsalbassma@zayna.shop>",
      to: [email],
      subject: "Your Albassma Filme Ticket",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #0f172a; border-radius: 16px; overflow: hidden;">
              <!-- Header -->
              <div style="background-color: #059669; padding: 4px;"></div>
              
              <!-- Content -->
              <div style="padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 32px; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                  ALBASSMA FILME
                </h1>
                <p style="color: #9ca3af; font-size: 14px; margin: 0 0 30px 0;">
                  Organized by Mohandiss Al Bassma
                </p>
                
                <!-- QR Code -->
                <div style="background-color: #ffffff; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: inline-block;">
                  <img src="${qrCodeUrl}" alt="Ticket QR Code" width="200" height="200" style="display: block;" />
                </div>
                
                <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                    Ticket Code
                  </p>
                  <p style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">
                    ${ticketCode}
                  </p>
                </div>
                
                <div style="margin-bottom: 24px;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">
                    Attendee
                  </p>
                  <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">
                    ${fullName}
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
                  ${formattedDate}
                </p>
                
                <div style="border-top: 1px solid #374151; padding-top: 24px;">
                  <p style="color: #9ca3af; font-size: 14px; margin: 0 0 16px 0;">
                    Thank you for registering! Your digital ticket has been generated.
                  </p>
                  <p style="color: #059669; font-size: 13px; margin: 0; font-weight: 500;">
                    📱 Present this QR code at the entrance
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
              © ${new Date().getFullYear()} Mohandiss Al Bassma Club. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-ticket-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
