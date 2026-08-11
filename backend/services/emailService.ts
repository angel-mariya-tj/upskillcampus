import nodemailer from 'nodemailer';
import { query } from '../config/db';

/**
 * Create a nodemailer transporter.
 * In development/test mode without SMTP credentials, uses a mock transport.
 */
const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // If no SMTP credentials configured, use a no-op transport for dev/test
  if (!smtpUser || !smtpPass) {
    return {
      sendMail: async (options: any) => {
        console.log(`[EMAIL MOCK] To: ${options.to}, Subject: ${options.subject}`);
        return { messageId: `mock_${Date.now()}` };
      },
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

const transporter = createTransporter();

/**
 * Log an email send attempt to the email_log table.
 */
const logEmail = async (
  userId: number | null,
  recipientEmail: string,
  templateName: string,
  subject: string,
  status: 'SENT' | 'FAILED',
  errorMessage?: string
) => {
  await query(
    `INSERT INTO email_log (user_id, recipient_email, template_name, subject, status, error_message, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, ${status === 'SENT' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    [userId, recipientEmail, templateName, subject, status, errorMessage || null]
  );
};

/**
 * Send an email and log the result.
 * Never throws — email failures are logged but do not crash the calling flow.
 */
const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  templateName: string,
  userId: number | null = null
) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@servanta.com',
      to,
      subject,
      html,
    });
    await logEmail(userId, to, templateName, subject, 'SENT');
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send ${templateName} to ${to}:`, err.message);
    await logEmail(userId, to, templateName, subject, 'FAILED', err.message);
  }
};

// ============================================================
// Template-based email methods
// ============================================================

/**
 * Send welcome email after registration.
 */
export const sendWelcomeEmail = async (userId: number, name: string, email: string) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; padding: 32px; color: white; text-align: center;">
        <h1 style="margin: 0 0 8px;">Welcome to Servanta! 🎉</h1>
        <p style="margin: 0; opacity: 0.9;">Connecting Services. Creating Opportunities.</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your account has been created successfully. You can now browse services, make bookings, and more.</p>
        <p style="color: #64748b; font-size: 14px;">Thank you for joining Servanta!</p>
      </div>
    </div>
  `;
  await sendEmail(email, 'Welcome to Servanta!', html, 'welcome', userId);
};

/**
 * Send booking confirmation to the customer.
 */
export const sendBookingConfirmation = async (
  userId: number,
  email: string,
  customerName: string,
  serviceName: string,
  businessName: string,
  bookingDate: string,
  bookingTime: string,
  price: string
) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; padding: 32px; color: white; text-align: center;">
        <h1 style="margin: 0 0 8px;">Booking Confirmed! ✅</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Your booking has been placed successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Service</td><td style="padding: 8px; font-weight: 600;">${serviceName}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Provider</td><td style="padding: 8px;">${businessName}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Date</td><td style="padding: 8px;">${bookingDate}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Time</td><td style="padding: 8px;">${bookingTime}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Amount</td><td style="padding: 8px; font-weight: 600;">₹${price}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">The merchant will review and accept your booking shortly.</p>
      </div>
    </div>
  `;
  await sendEmail(email, `Booking Confirmed — ${serviceName}`, html, 'booking_confirmation', userId);
};

/**
 * Send payment receipt to the customer.
 */
export const sendPaymentReceipt = async (
  userId: number,
  email: string,
  customerName: string,
  serviceName: string,
  amount: string,
  transactionId: string
) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); border-radius: 16px; padding: 32px; color: white; text-align: center;">
        <h1 style="margin: 0 0 8px;">Payment Successful! 💳</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Your payment has been processed successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Service</td><td style="padding: 8px;">${serviceName}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Amount</td><td style="padding: 8px; font-weight: 600;">₹${amount}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Transaction ID</td><td style="padding: 8px; font-size: 12px;">${transactionId}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">This receipt serves as your payment confirmation.</p>
      </div>
    </div>
  `;
  await sendEmail(email, `Payment Receipt — ₹${amount}`, html, 'payment_receipt', userId);
};

/**
 * Send refund notification to the customer.
 */
export const sendRefundNotification = async (
  userId: number,
  email: string,
  customerName: string,
  serviceName: string,
  refundAmount: string,
  refundId: string
) => {
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #f59e0b, #eab308); border-radius: 16px; padding: 32px; color: white; text-align: center;">
        <h1 style="margin: 0 0 8px;">Refund Processed 💰</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>A refund has been processed for your booking.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #64748b;">Service</td><td style="padding: 8px;">${serviceName}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Refund Amount</td><td style="padding: 8px; font-weight: 600;">₹${refundAmount}</td></tr>
          <tr><td style="padding: 8px; color: #64748b;">Refund ID</td><td style="padding: 8px; font-size: 12px;">${refundId}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">The refund will be credited to your original payment method within 5-7 business days.</p>
      </div>
    </div>
  `;
  await sendEmail(email, `Refund Processed — ₹${refundAmount}`, html, 'refund_notification', userId);
};

/**
 * Send booking status update notification to the customer.
 */
export const sendBookingStatusUpdate = async (
  userId: number,
  email: string,
  customerName: string,
  serviceName: string,
  newStatus: string
) => {
  const statusColors: Record<string, string> = {
    Accepted: '#059669',
    Rejected: '#dc2626',
    Completed: '#6366f1',
    Cancelled: '#f59e0b',
  };

  const color = statusColors[newStatus] || '#6366f1';

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc;">
      <div style="background: ${color}; border-radius: 16px; padding: 32px; color: white; text-align: center;">
        <h1 style="margin: 0 0 8px;">Booking ${newStatus}</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; margin-top: 16px;">
        <p>Hi <strong>${customerName}</strong>,</p>
        <p>Your booking for <strong>${serviceName}</strong> has been updated to <strong>${newStatus}</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">Log in to your Servanta dashboard for more details.</p>
      </div>
    </div>
  `;
  await sendEmail(email, `Booking ${newStatus} — ${serviceName}`, html, 'booking_status_update', userId);
};
