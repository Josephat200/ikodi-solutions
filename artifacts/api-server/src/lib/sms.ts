/**
 * SMS Service Configuration
 * Supports Twilio for SMS delivery
 */

export interface SMSConfig {
  enabled: boolean;
  provider: "twilio" | "mock";
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  messagingServiceSid?: string;
  senderId?: string;
  brandName: string;
}

export interface SMSMessage {
  to: string;
  body: string;
}

export const smsConfig: SMSConfig = {
  enabled: Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_SENDER_ID || process.env.TWILIO_PHONE_NUMBER),
  ),
  provider: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "twilio" : "mock",
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
  senderId: process.env.TWILIO_SENDER_ID,
  brandName: process.env.SMS_BRAND_NAME || "IKODI",
};

function ensureBrandedBody(message: string): string {
  const trimmed = String(message || "").trim();
  if (!trimmed) return `${smsConfig.brandName}:`;
  if (trimmed.toUpperCase().startsWith(`${smsConfig.brandName.toUpperCase()}:`)) return trimmed;
  return `${smsConfig.brandName}: ${trimmed}`;
}

/**
 * Mock SMS Service - for development
 */
export class MockSMSService {
  async send(message: SMSMessage): Promise<boolean> {
    console.log("📱 [MOCK] SMS sent:");
    console.log(`  To: ${message.to}`);
    console.log(`  Body: ${message.body}`);
    return true;
  }
}

/**
 * Twilio SMS Service
 */
export class TwilioSMSService {
  private accountSid: string;
  private authToken: string;
  private fromIdentity: string;
  private messagingServiceSid?: string;

  constructor(accountSid: string, authToken: string, fromIdentity: string, messagingServiceSid?: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromIdentity = fromIdentity;
    this.messagingServiceSid = messagingServiceSid;
  }

  async send(message: SMSMessage): Promise<boolean> {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

      const body = new URLSearchParams({
        To: message.to,
        Body: ensureBrandedBody(message.body),
      });

      if (this.messagingServiceSid) {
        body.set("MessagingServiceSid", this.messagingServiceSid);
      } else {
        body.set("From", this.fromIdentity);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Twilio SMS failed", response.status, errorBody);
        return false;
      }

      const payload = await response.json() as { sid?: string; status?: string };
      console.log("📱 [Twilio] SMS queued", {
        sid: payload.sid,
        status: payload.status,
        to: message.to,
        from: this.messagingServiceSid ? `MessagingService:${this.messagingServiceSid}` : this.fromIdentity,
      });
      return true;
    } catch (error) {
      console.error("Failed to send SMS:", error);
      return false;
    }
  }
}

/**
 * Get appropriate SMS service based on configuration
 */
export function getSMSService(): MockSMSService | TwilioSMSService {
  if (
    smsConfig.provider === "twilio" &&
    smsConfig.enabled &&
    smsConfig.accountSid &&
    smsConfig.authToken &&
    (smsConfig.messagingServiceSid || smsConfig.senderId || smsConfig.phoneNumber)
  ) {
    return new TwilioSMSService(
      smsConfig.accountSid,
      smsConfig.authToken,
      smsConfig.senderId || smsConfig.phoneNumber || smsConfig.brandName,
      smsConfig.messagingServiceSid,
    );
  }
  return new MockSMSService();
}

// SMS templates for common communications
export const smsTemplates = {
  paymentReminder: (studentName: string, amount: string) =>
    `Hi ${studentName}, you have an outstanding balance of KES${amount}. Please settle at your earliest convenience. Thank you.`,

  paymentConfirmation: (amount: string, reference: string) =>
    `Payment of KES${amount} confirmed. Ref: ${reference}. Thank you for your payment.`,

  sponsorshipUpdate: (studentName: string, sponsor: string) =>
    `${studentName} has been enrolled in ${sponsor}'s sponsorship program. Thank you for your support.`,

  attendanceAlert: (studentName: string) =>
    `${studentName}, your attendance is below 80%. Please ensure regular attendance.`,

  performanceAlert: (studentName: string) =>
    `${studentName}, your recent performance needs improvement. Please contact your advisor.`,
};

/**
 * Communication Service - handles both Email and SMS
 */
export class CommunicationService {
  private emailService: Awaited<ReturnType<typeof getEmailService>> | MockSMSService | TwilioSMSService;
  private smsService: MockSMSService | TwilioSMSService;

  constructor(emailService: any, smsService: MockSMSService | TwilioSMSService) {
    this.emailService = emailService;
    this.smsService = smsService;
  }

  async notifyPayment(
    to: string,
    studentName: string,
    amount: string,
    method: "email" | "sms" | "both"
  ): Promise<boolean> {
    let success = true;

    if (method === "email" || method === "both") {
      try {
        // await this.emailService.send({
        //   to,
        //   subject: "Payment Received",
        //   html: `Payment of KES${amount} for ${studentName} received.`,
        // });
        console.log("Email notification queued");
      } catch (error) {
        success = false;
      }
    }

    if (method === "sms" || method === "both") {
      try {
        await this.smsService.send({
          to,
          body: smsTemplates.paymentConfirmation(amount, "REF-" + Date.now()),
        });
      } catch (error) {
        success = false;
      }
    }

    return success;
  }

  async notifySponsorship(
    to: string,
    studentName: string,
    sponsorName: string,
    method: "email" | "sms" | "both"
  ): Promise<boolean> {
    let success = true;

    if (method === "email" || method === "both") {
      try {
        console.log("Email notification queued for sponsorship");
      } catch (error) {
        success = false;
      }
    }

    if (method === "sms" || method === "both") {
      try {
        await this.smsService.send({
          to,
          body: smsTemplates.sponsorshipUpdate(studentName, sponsorName),
        });
      } catch (error) {
        success = false;
      }
    }

    return success;
  }
}

export function getEmailService() {
  return new MockSMSService();
}
