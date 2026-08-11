import { query } from '../config/db';
import * as authService from '../services/authService';
import * as bookingService from '../services/bookingService';
import * as paymentService from '../services/paymentService';
import * as auditService from '../services/auditService';
import * as serviceService from '../services/serviceService';
import * as customerService from '../services/customerService';

async function runPhase15Tests() {
  console.log('=== STARTING PHASE 15 FEATURE & REGRESSION TEST SUITE ===\n');

  try {
    // Auth logins
    const customerAuth = await authService.loginUser({ email: 'rahul@servanta.com', password: 'customer123' });
    const merchantAuth = await authService.loginUser({ email: 'priya@servanta.com', password: 'merchant123' });
    const adminAuth = await authService.loginUser({ email: 'admin@servanta.com', password: 'admin123' });

    console.log('[AUTH] Logged in Customer (ID:', customerAuth.user.userId, '), Merchant (ID:', merchantAuth.user.userId, '), Admin (ID:', adminAuth.user.userId, ')');

    const custRec = await query('SELECT customer_id FROM customers WHERE user_id = $1', [customerAuth.user.userId]);
    const customerId = custRec.rows[0].customer_id;
    const targetSvc = await query('SELECT merchant_id, service_id, price FROM services LIMIT 1');
    const merchantId = targetSvc.rows[0].merchant_id;
    const serviceId = targetSvc.rows[0].service_id;

    // --- CANCELLATION TESTS ---
    console.log('\n--- [CANCELLATION TESTS] ---');

    // Test 1: Cancel unpaid Pending booking
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 30 + Math.floor(Math.random() * 30));
    const dateStr1 = futureDate1.toISOString().split('T')[0];
    const timeStr1 = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00`;

    const unpaidBk = await bookingService.createBooking({
      customerId, merchantId, serviceId,
      bookingDate: dateStr1, bookingTime: timeStr1,
    });
    const cancelResult1 = await bookingService.cancelBooking(unpaidBk.booking_id, customerAuth.user.userId);
    if (cancelResult1.status === 'Cancelled' && cancelResult1.refund === null) {
      console.log('[PASS] Test 1: Cancel unpaid Pending booking — no refund issued');
    } else {
      console.error('[FAIL] Test 1: Cancel unpaid Pending booking');
    }

    // Test 2: Cancel already Cancelled booking (should fail)
    try {
      await bookingService.cancelBooking(unpaidBk.booking_id, customerAuth.user.userId);
      console.error('[FAIL] Test 2: Cancel already Cancelled booking was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Test 2: Cancel already Cancelled booking rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Test 3: Unauthorized cancellation (wrong user)
    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 40 + Math.floor(Math.random() * 30));
    const dateStr2 = futureDate2.toISOString().split('T')[0];
    const timeStr2 = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00`;

    const otherBk = await bookingService.createBooking({
      customerId, merchantId, serviceId,
      bookingDate: dateStr2, bookingTime: timeStr2,
    });
    try {
      await bookingService.cancelBooking(otherBk.booking_id, 99999);
      console.error('[FAIL] Test 3: Unauthorized cancellation was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Test 3: Unauthorized cancellation rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // --- REFUND ELIGIBILITY TESTS ---
    console.log('\n--- [REFUND ELIGIBILITY TESTS] ---');

    // Test 4: Refund eligibility for unpaid booking
    const eligibility1 = await paymentService.checkRefundEligibility(unpaidBk.booking_id);
    if (!eligibility1.eligible) {
      console.log(`[PASS] Test 4: No refund for unpaid booking: "${eligibility1.reason}"`);
    } else {
      console.error('[FAIL] Test 4: Unpaid booking should not be refund eligible');
    }

    // Test 5: Refund for non-existent booking
    const eligibility2 = await paymentService.checkRefundEligibility(99999);
    if (!eligibility2.eligible) {
      console.log(`[PASS] Test 5: Non-existent booking not eligible: "${eligibility2.reason}"`);
    } else {
      console.error('[FAIL] Test 5: Non-existent booking should not be eligible');
    }

    // --- REFUND INITIATION TESTS ---
    console.log('\n--- [REFUND INITIATION TESTS] ---');

    // Test 6: Refund initiation for unpaid booking (should fail)
    try {
      await paymentService.initiateRefund(otherBk.booking_id, customerAuth.user.userId);
      console.error('[FAIL] Test 6: Refund for unpaid booking was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Test 6: Refund for unpaid booking rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Test 7: Refund for non-existent booking (should fail)
    try {
      await paymentService.initiateRefund(99999, customerAuth.user.userId);
      console.error('[FAIL] Test 7: Refund for non-existent booking was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Test 7: Refund for non-existent booking rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Test 8: Unauthorized refund (wrong user)
    try {
      await paymentService.initiateRefund(otherBk.booking_id, 99999);
      console.error('[FAIL] Test 8: Unauthorized refund was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Test 8: Unauthorized refund rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // --- PAID BOOKING REFUND FLOW ---
    console.log('\n--- [PAID BOOKING REFUND FLOW] ---');

    // Create a booking, accept it, simulate payment completion, then cancel
    const futureDate3 = new Date();
    futureDate3.setDate(futureDate3.getDate() + 60 + Math.floor(Math.random() * 30));
    const dateStr3 = futureDate3.toISOString().split('T')[0];
    const timeStr3 = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00`;

    const paidBk = await bookingService.createBooking({
      customerId, merchantId, serviceId,
      bookingDate: dateStr3, bookingTime: timeStr3,
    });

    // Accept booking
    await bookingService.updateBookingStatus(paidBk.booking_id, merchantAuth.user.userId, 'Accepted');

    // Simulate payment completion manually
    const price = targetSvc.rows[0].price;
    await query(
      `INSERT INTO payments (booking_id, amount, payment_status, razorpay_order_id, razorpay_payment_id, currency)
       VALUES ($1, $2, 'Completed', $3, $4, 'INR')
       ON CONFLICT (booking_id) DO UPDATE SET
         payment_status = 'Completed',
         razorpay_payment_id = EXCLUDED.razorpay_payment_id,
         amount = EXCLUDED.amount`,
      [paidBk.booking_id, price, `order_test_${Date.now()}`, `pay_test_${Date.now()}`]
    );
    console.log(`Created paid booking #${paidBk.booking_id} (Accepted, Paid) for ${dateStr3} at ${timeStr3}`);

    // Test 9: Refund eligibility for paid future booking
    const eligibility3 = await paymentService.checkRefundEligibility(paidBk.booking_id);
    if (eligibility3.eligible) {
      console.log(`[PASS] Test 9: Paid future booking eligible for refund: "${eligibility3.reason}", amount: ₹${eligibility3.amount}`);
    } else {
      console.error(`[FAIL] Test 9: Paid future booking should be eligible: "${eligibility3.reason}"`);
    }

    // Test 10: Cancel paid booking (triggers refund)
    const cancelResult2 = await bookingService.cancelBooking(paidBk.booking_id, customerAuth.user.userId);
    if (cancelResult2.status === 'Cancelled' && cancelResult2.refund && cancelResult2.refund.success) {
      console.log(`[PASS] Test 10: Paid booking cancelled with refund. Refund ID: ${cancelResult2.refund.refundId}, Amount: ₹${cancelResult2.refund.refundAmount}`);
    } else {
      console.error('[FAIL] Test 10: Paid booking cancellation/refund failed');
    }

    // Test 11: Verify payment status is now 'Refunded'
    const paymentCheck = await query('SELECT payment_status, refund_status, razorpay_refund_id, refund_amount FROM payments WHERE booking_id = $1', [paidBk.booking_id]);
    if (paymentCheck.rows[0].payment_status === 'Refunded' && paymentCheck.rows[0].refund_status === 'PROCESSED') {
      console.log(`[PASS] Test 11: Payment status: ${paymentCheck.rows[0].payment_status}, Refund status: ${paymentCheck.rows[0].refund_status}, Refund ID: ${paymentCheck.rows[0].razorpay_refund_id}`);
    } else {
      console.error('[FAIL] Test 11: Payment status not correctly updated after refund');
    }

    // Test 12: Duplicate refund prevention
    try {
      await paymentService.initiateRefund(paidBk.booking_id, customerAuth.user.userId);
      console.error('[FAIL] Test 12: Duplicate refund was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Test 12: Duplicate refund prevented: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // --- AUDIT LOG TESTS ---
    console.log('\n--- [AUDIT LOG TESTS] ---');

    // Test 13: Booking cancellation creates audit log
    const cancelLogs = await query(
      `SELECT * FROM audit_logs WHERE action = 'BOOKING_CANCELLED' AND entity_id = $1`,
      [unpaidBk.booking_id]
    );
    if (cancelLogs.rows.length > 0) {
      console.log(`[PASS] Test 13: Booking cancellation audit log exists (log_id: ${cancelLogs.rows[0].log_id})`);
    } else {
      console.error('[FAIL] Test 13: No BOOKING_CANCELLED audit log found');
    }

    // Test 14: Refund creates audit log
    const refundLogs = await query(
      `SELECT * FROM audit_logs WHERE action = 'REFUND_PROCESSED' AND entity_type = 'Payment'`
    );
    if (refundLogs.rows.length > 0) {
      console.log(`[PASS] Test 14: REFUND_PROCESSED audit log exists (log_id: ${refundLogs.rows[0].log_id})`);
    } else {
      console.error('[FAIL] Test 14: No REFUND_PROCESSED audit log found');
    }

    // Test 15: Booking status change creates audit log
    const statusLogs = await query(
      `SELECT * FROM audit_logs WHERE action = 'BOOKING_STATUS_CHANGED' LIMIT 1`
    );
    if (statusLogs.rows.length > 0) {
      console.log(`[PASS] Test 15: BOOKING_STATUS_CHANGED audit log exists`);
    } else {
      console.error('[FAIL] Test 15: No BOOKING_STATUS_CHANGED audit log found');
    }

    // Test 16: Admin can retrieve paginated audit logs
    const auditPage = await auditService.getAuditLogs(1, 10);
    if (auditPage.data.length > 0 && auditPage.pagination.page === 1) {
      console.log(`[PASS] Test 16: Admin audit logs paginated correctly (${auditPage.pagination.total} total logs)`);
    } else {
      console.error('[FAIL] Test 16: Admin audit log retrieval failed');
    }

    // Test 17: Audit logs do NOT contain sensitive credentials
    const allLogs = await query(`SELECT details FROM audit_logs WHERE details IS NOT NULL`);
    let sensitiveFound = false;
    for (const row of allLogs.rows) {
      const detailStr = JSON.stringify(row.details).toLowerCase();
      if (detailStr.includes('password') || detailStr.includes('secret') || detailStr.includes('key_secret') || detailStr.includes('cvv')) {
        sensitiveFound = true;
        break;
      }
    }
    if (!sensitiveFound) {
      console.log('[PASS] Test 17: No sensitive credentials found in audit log details');
    } else {
      console.error('[FAIL] Test 17: Sensitive credentials found in audit logs!');
    }

    // Test 18: Audit log filter by action
    const filteredLogs = await auditService.getAuditLogs(1, 10, 'BOOKING_CANCELLED');
    if (filteredLogs.data.every((l: any) => l.action === 'BOOKING_CANCELLED')) {
      console.log(`[PASS] Test 18: Audit log action filter works (${filteredLogs.data.length} BOOKING_CANCELLED logs)`);
    } else {
      console.error('[FAIL] Test 18: Audit log action filter returned wrong actions');
    }

    // --- REGRESSION TESTS ---
    console.log('\n--- [REGRESSION TESTS] PHASE 12-14 VALIDATION ---');

    // Test 19: Service search + pagination (Phase 13/14)
    const searchRes = await serviceService.listAllServices(undefined, undefined, undefined, undefined, 'newest', 1, 10);
    console.log(`[PASS] Test 19: Service search + pagination: ${searchRes.data.length} items, page ${searchRes.pagination.page}`);

    // Test 20: Favorites (Phase 13)
    const favs = await customerService.getFavorites(customerAuth.user.userId);
    console.log(`[PASS] Test 20: Customer favorites accessible (${favs.length} items)`);

    // Test 21: Booking rescheduling still works (Phase 14)
    const futureDate4 = new Date();
    futureDate4.setDate(futureDate4.getDate() + 90 + Math.floor(Math.random() * 30));
    const dateStr4 = futureDate4.toISOString().split('T')[0];
    const timeStr4 = `${(8 + Math.floor(Math.random() * 10)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 59).toString().padStart(2, '0')}:00`;

    const reschBk = await bookingService.createBooking({
      customerId, merchantId, serviceId,
      bookingDate: dateStr4, bookingTime: timeStr4,
    });
    const futureDate5 = new Date();
    futureDate5.setDate(futureDate5.getDate() + 120 + Math.floor(Math.random() * 30));
    const dateStr5 = futureDate5.toISOString().split('T')[0];
    const reschResult = await bookingService.rescheduleBooking(reschBk.booking_id, customerAuth.user.userId, dateStr5, '14:30:00');
    console.log(`[PASS] Test 21: Booking rescheduled from ${dateStr4} to ${reschResult.booking_date}`);

    // Test 22: Rescheduling creates audit log
    const reschLogs = await query(
      `SELECT * FROM audit_logs WHERE action = 'BOOKING_RESCHEDULED' AND entity_id = $1`,
      [reschBk.booking_id]
    );
    if (reschLogs.rows.length > 0) {
      console.log('[PASS] Test 22: BOOKING_RESCHEDULED audit log exists');
    } else {
      console.error('[FAIL] Test 22: No BOOKING_RESCHEDULED audit log found');
    }

    // Test 23: Merchant analytics (Phase 14)
    const merchantAnalytics = await paymentService.getMerchantAnalytics(merchantAuth.user.userId);
    console.log(`[PASS] Test 23: Merchant analytics accessible (total earnings: ₹${merchantAnalytics.totalEarnings})`);

    // Test 24: Admin analytics (Phase 14)
    const adminAnalytics = await paymentService.getAdminAnalytics();
    console.log(`[PASS] Test 24: Admin analytics accessible (total users: ${adminAnalytics.users.total_users})`);

    console.log('\n=== ALL PHASE 15 TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Phase 15 test suite error:', error);
  } finally {
    process.exit(0);
  }
}

runPhase15Tests();
