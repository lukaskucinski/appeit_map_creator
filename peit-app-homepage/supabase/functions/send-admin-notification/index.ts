// @ts-nocheck
// Supabase Edge Function to send admin notifications via Resend
// Triggered by database trigger on auth.users INSERT

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const RESEND_ENDPOINT = "https://api.resend.com/emails"

const APP_NAME = "PEIT Map Creator"
const SENDER_EMAIL = "noreply@peit-map-creator.com"
const ADMIN_EMAIL = "lukaskucinski@gmail.com"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set")
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const { type, email, name } = await req.json()

    if (type === "new_user") {
      const displayName = name || "Unknown"
      const timestamp = new Date().toISOString()

      console.log(`Sending admin notification for new user: ${email}`)

      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${APP_NAME} <${SENDER_EMAIL}>`,
          to: [ADMIN_EMAIL],
          subject: `PEIT: New user signup - ${email}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; padding: 20px;">
              <h2 style="margin: 0 0 16px; color: #1a1a1a;">New User Signup</h2>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Name:</strong> ${displayName}</p>
              <p><strong>Time:</strong> ${timestamp}</p>
            </div>
          `,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Resend API error:", result)
        return new Response(
          JSON.stringify({ error: "Failed to send notification", details: result }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        )
      }

      console.log(`Admin notification sent for new user: ${email}`, result)

      return new Response(
        JSON.stringify({ success: true, messageId: result.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Unknown notification type" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error sending admin notification:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
