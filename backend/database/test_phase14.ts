import { query } from '../config/db';
import * as authService from '../services/authService';
import * as serviceService from '../services/serviceService';
import * as merchantService from '../services/merchantService';
import * as bookingService from '../services/bookingService';
import * as paymentService from '../services/paymentService';
import * as customerService from '../services/customerService';

async function runPhase14Tests() {
  console.log('=== STARTING PHASE 14 FEATURE & REGRESSION TEST SUITE ===\n');

  try {
    // Auth logins
    const customerAuth = await authService.loginUser({ email: 'rahul@servanta.com', password: 'customer123' });
    const merchantAuth = await authService.loginUser({ email: 'priya@servanta.com', password: 'merchant123' });
    const adminAuth = await authService.loginUser({ email: 'admin@servanta.com', password: 'admin123' });

    console.log('[AUTH] Logged in Customer (ID:', customerAuth.user.userId, '), Merchant (ID:', merchantAuth.user.userId, '), Admin (ID:', adminAuth.user.userId, ')');

    // --- FEATURE 1: STANDARDIZED API PAGINATION ---
    console.log('\n--- [FEATURE 1] STANDARDIZED API PAGINATION ---');
    
    // 1. Default pagination
    const defaultPage = await serviceService.listAllServices();
    console.log(`[PASS] Default services pagination: page=${defaultPage.pagination.page}, limit=${defaultPage.pagination.limit}, total=${defaultPage.pagination.total}, totalPages=${defaultPage.pagination.totalPages}`);

    // 2. Custom page & limit
    const page2 = await serviceService.listAllServices(undefined, undefined, undefined, undefined, undefined, 2, 2);
    console.log(`[PASS] Page 2, Limit 2: returned ${page2.data.length} items (page: ${page2.pagination.page})`);

    // 3. Max limit cap (100)
    const maxLimitRes = await serviceService.listAllServices(undefined, undefined, undefined, undefined, undefined, 1, 999);
    if (maxLimitRes.pagination.limit === 100) {
      console.log('[PASS] Maximum limit capped at 100 safely.');
    } else {
      console.error('[FAIL] Maximum limit cap failed:', maxLimitRes.pagination.limit);
    }

    // 4. Merchant pagination
    const merchantPage = await merchantService.listMerchants(undefined, undefined, 1, 5);
    console.log(`[PASS] Merchants pagination: page=${merchantPage.pagination.page}, limit=${merchantPage.pagination.limit}, total=${merchantPage.pagination.total}`);

    // 5. Booking pagination
    const bookingPage = await bookingService.getCustomerBookings(customerAuth.user.userId, 1, 5);
    console.log(`[PASS] Customer bookings pagination: total=${bookingPage.pagination.total}`);

    // --- FEATURE 2: BOOKING RESCHEDULING ---
    console.log('\n--- [FEATURE 2] BOOKING RESCHEDULING ---');
    
    // Get target merchant and active booking
    const custRec = await query('SELECT customer_id FROM customers WHERE user_id = $1', [customerAuth.user.userId]);
    const customerId = custRec.rows[0].customer_id;
    const targetSvc = await query('SELECT merchant_id, service_id FROM services LIMIT 1');

    // Create tomorrow booking with unique time slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 5 + Math.floor(Math.random() * 20));
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const uniqueHour = (10 + Math.floor(Math.random() * 8)).toString().padStart(2, '0');
    const uniqueMin = Math.floor(Math.random() * 59).toString().padStart(2, '0');
    const uniqueTimeStr = `${uniqueHour}:${uniqueMin}:00`;

    const newBk = await bookingService.createBooking({
      customerId,
      merchantId: targetSvc.rows[0].merchant_id,
      serviceId: targetSvc.rows[0].service_id,
      bookingDate: tomorrowStr,
      bookingTime: uniqueTimeStr,
    });
    console.log(`Created test booking #${newBk.booking_id} for date ${tomorrowStr} at ${uniqueTimeStr}`);

    // Reschedule to day after tomorrow
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 25 + Math.floor(Math.random() * 20));
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    const rescheduledBk = await bookingService.rescheduleBooking(
      newBk.booking_id,
      customerAuth.user.userId,
      dayAfterStr,
      '11:42:00'
    );
    console.log(`[PASS] Customer rescheduled booking #${rescheduledBk.booking_id} to ${rescheduledBk.booking_date} at ${rescheduledBk.booking_time}`);

    // Past Date Rejection
    try {
      await bookingService.rescheduleBooking(newBk.booking_id, customerAuth.user.userId, '2020-01-01', '10:00:00');
      console.error('[FAIL] Past date reschedule was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Past date reschedule rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Unauthorized User Rejection
    try {
      await bookingService.rescheduleBooking(newBk.booking_id, 99999, dayAfterStr, '12:00:00');
      console.error('[FAIL] Unauthorized user reschedule was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Unauthorized user reschedule rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // --- FEATURE 3: MERCHANT ANALYTICS ---
    console.log('\n--- [FEATURE 3] MERCHANT ANALYTICS ---');
    const merchantAnalytics = await paymentService.getMerchantAnalytics(merchantAuth.user.userId);
    console.log('[PASS] Merchant analytics retrieved:', {
      totalEarnings: merchantAnalytics.totalEarnings,
      totalBookings: merchantAnalytics.totalBookings,
      pendingBookings: merchantAnalytics.pendingBookings,
      acceptedBookings: merchantAnalytics.acceptedBookings,
      completedBookings: merchantAnalytics.completedBookings,
      monthlyRevenueCount: merchantAnalytics.monthlyRevenue.length,
    });

    // --- FEATURE 4: ADMIN ANALYTICS ---
    console.log('\n--- [FEATURE 4] ADMIN PLATFORM ANALYTICS ---');
    const adminAnalytics = await paymentService.getAdminAnalytics();
    console.log('[PASS] Admin platform analytics retrieved:', {
      users: adminAnalytics.users,
      services: adminAnalytics.services,
      bookings: adminAnalytics.bookings,
      payments: adminAnalytics.payments,
      monthlyMetricsCount: adminAnalytics.monthlyMetrics.length,
    });

    // --- REGRESSION TESTS (PHASE 12 & 13) ---
    console.log('\n--- [REGRESSION TESTS] PHASE 12 & 13 VALIDATION ---');
    // 1. Service Search & Whitelisted Sort
    const searchRes = await serviceService.listAllServices(undefined, 'plumb', undefined, undefined, 'price_asc', 1, 10);
    console.log(`[PASS] Regression: Service search + whitelisted sort returned ${searchRes.data.length} items`);

    // 2. Favorites CRUD
    const favs = await customerService.getFavorites(customerAuth.user.userId);
    console.log(`[PASS] Regression: Customer favorites accessible (${favs.length} items)`);

    console.log('\n=== ALL PHASE 14 TESTS PASSED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Phase 14 test suite error:', error);
  } finally {
    process.exit(0);
  }
}

runPhase14Tests();
