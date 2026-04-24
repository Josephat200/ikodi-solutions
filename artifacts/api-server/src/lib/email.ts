/**
 * Email Service Configuration
 * Supports SendGrid for email delivery
 */

export interface EmailConfig {
  enabled: boolean;
  provider: "sendgrid" | "mock";
  apiKey?: string;
  fromEmail?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailConfig: EmailConfig = {
  enabled: !!process.env.SENDGRID_API_KEY,
  provider: process.env.SENDGRID_API_KEY ? "sendgrid" : "mock",
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.SENDGRID_FROM_EMAIL || "noreply@ikodi.local",
};

/**
 * Mock Email Service - for development
 */
export class MockEmailService {
  async send(message: EmailMessage): Promise<boolean> {
    console.log("📧 [MOCK] Email sent:");
    console.log(`  To: ${message.to}`);
    console.log(`  Subject: ${message.subject}`);
    return true;
  }
}

/**
 * SendGrid Email Service
 */
export class SendGridEmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(message: EmailMessage): Promise<boolean> {
    try {
      // In production, integrate with SendGrid API
      // For now, this is a placeholder
      console.log("📧 [SendGrid] Email queued:");
      console.log(`  To: ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
      console.log("Note: SendGrid integration requires additional setup");
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }
}

/**
 * Get appropriate email service based on configuration
 */
export function getEmailService(): MockEmailService | SendGridEmailService {
  if (emailConfig.provider === "sendgrid" && emailConfig.apiKey) {
    return new SendGridEmailService(emailConfig.apiKey);
  }
  return new MockEmailService();
}

// Email templates for common communications
export const emailTemplates = {
  sponsorshipConfirmation: (
    studentName: string,
    sponsorName: string,
    amount: string
  ) => ({
    subject: `Sponsorship Confirmation - ${studentName}`,
    html: `
      <h2>Sponsorship Confirmed</h2>
      <p>Dear ${sponsorName},</p>
      <p>${studentName} has been enrolled in your sponsorship program.</p>
      <p><strong>Sponsorship Amount:</strong> KES ${amount}</p>
      <p>Thank you for supporting education.</p>
    `,
  }),

  paymentReceipt: (
    studentName: string,
    paymentAmount: string,
    referenceNumber: string
  ) => ({
    subject: `Payment Receipt - ${referenceNumber}`,
    html: `
      <h2>Payment Received</h2>
      <p>Dear Student,</p>
      <p>Your payment of KES ${paymentAmount} has been received.</p>
      <p><strong>Reference:</strong> ${referenceNumber}</p>
      <p>Thank you for your payment.</p>
    `,
  }),

  paymentReminder: (
    studentName: string,
    outstandingAmount: string,
    dueDate: string
  ) => ({
    subject: `Payment Reminder - Outstanding Balance`,
    html: `
      <h2>Payment Reminder</h2>
      <p>Dear ${studentName},</p>
      <p>You have an outstanding balance of KES ${outstandingAmount}.</p>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <p>Please arrange payment at your earliest convenience.</p>
    `,
  }),
};
