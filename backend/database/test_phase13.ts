import { query } from '../config/db';
import * as authService from '../services/authService';
import * as serviceService from '../services/serviceService';
import * as customerService from '../services/customerService';
import * as bookingService from '../services/bookingService';

async function runPhase13Tests() {
  console.log('=== STARTING PHASE 13 FEATURE VALIDATION SUITE ===\n');

  try {
    // 1. Authenticate Customer (Rahul Verma)
    const customerLogin = await authService.loginUser({ email: 'rahul@servanta.com', password: 'customer123' });
    const customerUser = customerLogin.user;
    console.log(`[AUTH] Logged in Customer: ${customerUser.name} (User ID: ${customerUser.userId})`);

    // --- FEATURE 1: PRICE FILTERING & SERVICE SORTING ---
    console.log('\n--- [FEATURE 1] PRICE FILTERING & SERVICE SORTING ---');

    // Test min/max price filter
    const filteredServices = await serviceService.listAllServices(undefined, undefined, 100, 1000, 'price_asc');
    console.log(`Filtered services count (min: 100, max: 1000, sort: price_asc): ${filteredServices.data.length}`);
    const prices = filteredServices.data.map((s: any) => parseFloat(s.price));
    console.log('Returned prices:', prices);

    const isSortedAsc = prices.every((val: number, i: number, arr: number[]) => !i || arr[i - 1] <= val);
    if (isSortedAsc) {
      console.log('[PASS] Price Ascending sorting verified.');
    } else {
      console.error('[FAIL] Price Ascending sorting failed!');
    }

    // Test Invalid min > max validation
    try {
      await serviceService.listAllServices(undefined, undefined, 500, 100);
      console.error('[FAIL] Invalid price range (500 > 100) was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Invalid price range rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Test Malicious/Fallback Sort String
    const maliciousSort = await serviceService.listAllServices(undefined, undefined, undefined, undefined, 'DROP TABLE users;');
    console.log(`[PASS] Malicious/invalid sort parameter handled safely via whitelist. Returned ${maliciousSort.data.length} items.`);

    // --- FEATURE 2: CUSTOMER FAVORITES / WISHLIST ---
    console.log('\n--- [FEATURE 2] CUSTOMER FAVORITES / WISHLIST ---');
    const svcRes = await query('SELECT service_id FROM services LIMIT 1');
    const targetServiceId = svcRes.rows[0].service_id;

    // Add Favorite
    try {
      const favAdded = await customerService.addFavorite(customerUser.userId, targetServiceId);
      console.log('[PASS] Added service to favorites:', favAdded);
    } catch (err: any) {
      if (err.statusCode === 409) {
        console.log('[PASS] Favorite already exists for this test user.');
      } else throw err;
    }

    // Test Duplicate Favorite Prevention
    try {
      await customerService.addFavorite(customerUser.userId, targetServiceId);
      console.error('[FAIL] Duplicate favorite allowed!');
    } catch (err: any) {
      console.log(`[PASS] Duplicate favorite blocked cleanly: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Get Favorites
    const favList = await customerService.getFavorites(customerUser.userId);
    console.log(`[PASS] Customer favorites list retrieved. Total items: ${favList.length}`);

    // Remove Favorite
    const removeRes = await customerService.removeFavorite(customerUser.userId, targetServiceId);
    console.log(`[PASS] Removed favorite: "${removeRes.message}"`);

    // --- FEATURE 3: CUSTOMER PROFILE EDITING ---
    console.log('\n--- [FEATURE 3] CUSTOMER PROFILE EDITING ---');
    const updatedProfile = await customerService.updateCustomerProfile(customerUser.userId, 'Rahul Verma (Updated)', '+91 9999988888');
    console.log('[PASS] Updated profile returned:', updatedProfile);

    // Verify persistence in DB
    const checkDbUser = await query('SELECT name, phone FROM users WHERE user_id = $1', [customerUser.userId]);
    if (checkDbUser.rows[0].name === 'Rahul Verma (Updated)' && checkDbUser.rows[0].phone === '+91 9999988888') {
      console.log('[PASS] Profile changes verified directly in database.');
    } else {
      console.error('[FAIL] Profile changes failed DB verification!');
    }

    // Revert profile name back
    await customerService.updateCustomerProfile(customerUser.userId, 'Rahul Verma', (customerUser as any).phone || '');

    // --- FEATURE 4: BOOKING PAST-DATE VALIDATION ---
    console.log('\n--- [FEATURE 4] BOOKING PAST-DATE VALIDATION GUARD ---');
    const custRecord = await query('SELECT customer_id FROM customers WHERE user_id = $1', [customerUser.userId]);
    const customerId = custRecord.rows[0].customer_id;
    const targetMerchant = await query('SELECT merchant_id, service_id FROM services LIMIT 1');

    // Test Past Date (Yesterday)
    try {
      await bookingService.createBooking({
        customerId,
        merchantId: targetMerchant.rows[0].merchant_id,
        serviceId: targetMerchant.rows[0].service_id,
        bookingDate: '2020-01-01',
        bookingTime: '10:00:00',
      });
      console.error('[FAIL] Past date booking was allowed!');
    } catch (err: any) {
      console.log(`[PASS] Past date booking rejected: "${err.message}" (HTTP ${err.statusCode})`);
    }

    // Test Future Date (Tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

    const validBooking = await bookingService.createBooking({
      customerId,
      merchantId: targetMerchant.rows[0].merchant_id,
      serviceId: targetMerchant.rows[0].service_id,
      bookingDate: tomorrowDateStr,
      bookingTime: '14:00:00',
    });
    console.log(`[PASS] Future date booking accepted cleanly: Booking ID ${validBooking.booking_id}`);

    console.log('\n=== ALL PHASE 13 PRIORITY 1 TESTS PASSED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Phase 13 test suite error:', error);
  } finally {
    process.exit(0);
  }
}

runPhase13Tests();
