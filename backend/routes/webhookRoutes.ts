import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhookController';

const router = Router();

// Razorpay webhook — no auth middleware, signature-verified only
router.post('/razorpay', handleRazorpayWebhook);

export default router;
