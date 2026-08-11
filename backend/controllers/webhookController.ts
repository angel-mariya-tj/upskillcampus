import { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature, storeWebhookEvent, processWebhookEvent } from '../services/webhookService';

/**
 * POST /webhooks/razorpay — Handle incoming Razorpay webhook events.
 * Uses raw body for signature verification.
 * Returns 200 immediately to prevent Razorpay retries.
 */
export const handleRazorpayWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'servanta_webhook_secret_test';

    if (!signature) {
      res.status(401).json({ status: 'error', message: 'Missing webhook signature.' });
      return;
    }

    // req.body is raw string when using express.raw() on this route
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify HMAC signature
    let isValid = false;
    try {
      isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    } catch (err) {
      // Signature length mismatch or other crypto error
      isValid = false;
    }

    if (!isValid) {
      res.status(401).json({ status: 'error', message: 'Invalid webhook signature.' });
      return;
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = payload.event;
    const razorpayEventId = payload.account_id + '_' + (payload.payload?.payment?.entity?.id || payload.payload?.refund?.entity?.id || Date.now());

    // Store event (idempotent — returns false if duplicate)
    const isNew = await storeWebhookEvent(razorpayEventId, eventType, payload);

    if (isNew) {
      // Process asynchronously (but still within this request for simplicity)
      await processWebhookEvent(razorpayEventId, eventType, payload);
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    // Still respond 200 to prevent Razorpay retries on our errors
    console.error('Webhook processing error:', error);
    res.status(200).json({ status: 'ok' });
  }
};
