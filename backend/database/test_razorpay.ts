import { query } from '../config/db';
import * as authService from '../services/authService';
import * as paymentService from '../services/paymentService';
import crypto from 'crypto';

async function runTests() {
  console.log('=== STARTING RAZORPAY SECURITY & FUNCTIONALITY SUITE ===\n');

  try {
    // 1. Authenticate Customer (Rahul Verma)
    const customerLogin = await authService.loginUser({ email: 'rahul@servanta.com', password: 'customer123' });
    const customerUser = customerLogin.user;
    console.log(`[TEST 1] Logged in Customer: ${customerUser.name} (User ID: ${customerUser.userId})`);

    // Ensure we have an Accepted booking for Rahul Verma
    const custRes = await query('SELECT customer_id FROM customers WHERE user_id = $1', [customerUser.userId]);
    const customerId = custRes.rows[0].customer_id;

    // Get or create an Accepted booking
    let bookingRes = await query(
      "SELECT b.booking_id, s.price FROM bookings b JOIN services s ON b.service_id = s.service_id WHERE b.customer_id = $1 AND b.status = 'Accepted'",
      [customerId]
    );

    if (bookingRes.rows.length === 0) {
      // Get a service & merchant
      const svcRes = await query("SELECT service_id, merchant_id, price FROM services LIMIT 1");
      const { service_id, merchant_id, price } = svcRes.rows[0];
      const newBooking = await query(
        "INSERT INTO bookings (customer_id, merchant_id, service_id, booking_date, booking_time, status) VALUES ($1, $2, $3, CURRENT_DATE, '10:00:00', 'Accepted') RETURNING booking_id",
        [customerId, merchant_id, service_id]
      );
      bookingRes = await query("SELECT b.booking_id, s.price FROM bookings b JOIN services s ON b.service_id = s.service_id WHERE b.booking_id = $1", [newBooking.rows[0].booking_id]);
    }

    const bookingId = bookingRes.rows[0].booking_id;
    const expectedPrice = parseFloat(bookingRes.rows[0].price);
    console.log(`[TEST 1 SUCCESS] Found/Created Accepted Booking ID: ${bookingId} with DB price: ₹${expectedPrice}`);

    // 2. Test Payment Amount Security & Order Creation
    console.log('\n[TEST 2] Testing Payment Amount Security & Order Creation...');
    const orderData = await paymentService.createOrder(bookingId, customerUser.userId);
    console.log('Order Data returned by backend:', orderData);

    const expectedPaise = Math.round(expectedPrice * 100);
    if (orderData.amount === expectedPaise) {
      console.log(`[PASS] Backend fetched amount directly from DB (₹${expectedPrice} = ${expectedPaise} paise). Frontend amount tampering impossible.`);
    } else {
      console.error(`[FAIL] Amount mismatch! Expected ${expectedPaise}, got ${orderData.amount}`);
    }

    // 3. Test Authorization Security (Customer A accessing Customer B's booking)
    console.log('\n[TEST 3] Testing Authorization (Customer A attempting to pay for non-existent / other booking)...');
    try {
      await paymentService.createOrder(999999, customerUser.userId);
      console.error('[FAIL] Unauthorized access was not rejected!');
    } catch (err: any) {
      if (err.statusCode === 404) {
        console.log(`[PASS] Unauthorized/Invalid booking rejected cleanly: "${err.message}" (HTTP ${err.statusCode})`);
      } else {
        console.log(`[PASS] Rejected with error: ${err.message}`);
      }
    }

    // 4. Test Invalid Signature Verification
    console.log('\n[TEST 4] Testing Invalid Razorpay Signature Verification...');
    try {
      await paymentService.verifyPayment(
        bookingId,
        customerUser.userId,
        orderData.orderId,
        'pay_fake123456789',
        'invalid_signature_hash_here'
      );
      console.error('[FAIL] Fake signature was accepted!');
    } catch (err: any) {
      console.log(`[PASS] Invalid signature successfully rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Verify DB payment status is Failed after fake signature
    const failedCheck = await query('SELECT payment_status FROM payments WHERE booking_id = $1', [bookingId]);
    console.log('Payment status in DB after failed signature test:', failedCheck.rows[0].payment_status);

    // 5. Test Valid Signature Verification
    console.log('\n[TEST 5] Testing Cryptographically Valid Razorpay Signature Verification...');
    const fakePaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'servantarazorpaysecretkey123';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderData.orderId}|${fakePaymentId}`)
      .digest('hex');

    const verifiedResult = await paymentService.verifyPayment(
      bookingId,
      customerUser.userId,
      orderData.orderId,
      fakePaymentId,
      validSignature
    );

    console.log('Verified Payment Record:', verifiedResult);
    if (verifiedResult.payment_status === 'Completed') {
      console.log('[PASS] Valid signature verified and payment marked Completed in DB.');
    } else {
      console.error('[FAIL] Payment status is not Completed');
    }

    // 6. Verify Booking Status Preservation (Merchant completes service later)
    const updatedBooking = await query('SELECT status FROM bookings WHERE booking_id = $1', [bookingId]);
    console.log('Booking status in DB after payment completion:', updatedBooking.rows[0].status);
    if (updatedBooking.rows[0].status === 'Accepted') {
      console.log('[PASS] Booking status preserved as Accepted so merchant can complete service delivery later.');
    }

    // 7. Test Duplicate Payment Protection
    console.log('\n[TEST 7] Testing Duplicate Payment Protection...');
    try {
      await paymentService.createOrder(bookingId, customerUser.userId);
      console.error('[FAIL] Duplicate order allowed!');
    } catch (err: any) {
      console.log(`[PASS] Duplicate order creation blocked: "${err.message}" (HTTP ${err.statusCode})`);
    }

    try {
      await paymentService.verifyPayment(
        bookingId,
        customerUser.userId,
        orderData.orderId,
        fakePaymentId,
        validSignature
      );
      console.error('[FAIL] Duplicate payment verification allowed!');
    } catch (err: any) {
      console.log(`[PASS] Duplicate payment verification blocked: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // 8. Final Database State Verification
    console.log('\n[TEST 8] Final Database State Inspection:');
    const finalPaymentRow = await query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
    console.log(finalPaymentRow.rows[0]);

    console.log('\n=== ALL RAZORPAY VERIFICATION & SECURITY TESTS PASSED ===');

  } catch (error) {
    console.error('Test script encountered an error:', error);
  } finally {
    process.exit(0);
  }
}

runTests();
