"use server";

import { getSupabase } from "../supabase";
import { record_usage, check_limit } from "../billing/limits";
import nodemailer from "nodemailer";

export async function create_campaign(
  workspace_id: string,
  segment_id: string,
  subject: string,
  body: string,
  send_time?: string
) {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "No DB" };

  const status = send_time ? "scheduled" : "draft";

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      workspace_id,
      segment_id,
      target_segment_id: segment_id,
      subject,
      body,
      status,
      send_time: send_time || null
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, campaign: data };
}

export async function schedule_campaign(campaign_id: string, send_time: string) {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "No DB" };

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: "scheduled",
      send_time
    })
    .eq("id", campaign_id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, campaign: data };
}

export async function get_campaign_stats(campaign_id: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();
  const { data: engagements } = await supabase
    .from("campaign_engagement")
    .select("*")
    .eq("campaign_id", campaign_id);

  if (!campaign || !engagements) return null;

  const total = engagements.length;
  const delivered = engagements.filter((e) => e.status !== "failed").length;
  const opened = engagements.filter((e) => e.status === "opened" || e.opened_at).length;
  const clicked = engagements.filter((e) => e.status === "clicked" || e.clicked_at).length;

  return {
    sent: total,
    delivered,
    opened,
    clicked,
    open_rate: total > 0 ? (opened / total) * 100 : 0,
    click_rate: total > 0 ? (clicked / total) * 100 : 0
  };
}

export async function send_followup(
  workspace_id: string,
  contact_id: string,
  subject: string,
  body: string
) {
  const supabase = getSupabase();
  if (!supabase) return { success: false };

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contact_id)
    .single();
  if (!contact) return { success: false, error: "Contact not found" };

  const limitCheck = await check_limit(workspace_id, "emails_sent");
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.reason };
  }

  // Setup Mailtrap SMTP transport
  const smtpHost = process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io";
  const smtpPort = parseInt(process.env.SMTP_PORT || "2525", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM || '"Nexus Platform" <hello@nexus.internal>';

  try {
    if (smtpUser && smtpPass && !smtpUser.includes("your_mailtrap")) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail({
        from: mailFrom,
        to: contact.email,
        subject,
        text: body
      });
    }
  } catch (err) {
    console.warn("Mail send error", err);
  }

  await record_usage(workspace_id, "emails_sent", 1);

  return { success: true };
}
