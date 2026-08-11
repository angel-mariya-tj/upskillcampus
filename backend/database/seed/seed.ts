import pool from '../../config/db';
import bcrypt from 'bcrypt';

const seedData = async () => {
  try {
    console.log('Seeding database...');

    // Seed Categories
    const categories = [
      { name: 'Home Services', description: 'Plumbing, electrical, carpentry and other home maintenance services' },
      { name: 'Beauty Services', description: 'Hair styling, makeup, spa, and other beauty treatments' },
      { name: 'Pet Care', description: 'Pet grooming, walking, boarding, and veterinary services' },
      { name: 'Repair Services', description: 'Electronics, appliance, and vehicle repair services' },
      { name: 'Cleaning Services', description: 'Home cleaning, office cleaning, and deep cleaning services' },
      { name: 'Professional Services', description: 'Tutoring, consulting, photography, and other professional services' },
    ];

    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories (category_name, description) VALUES ($1, $2) ON CONFLICT (category_name) DO NOTHING',
        [cat.name, cat.description]
      );
    }
    console.log('Categories seeded.');

    // Seed Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await pool.query(
      `INSERT INTO users (name, email, password, phone, role_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'Admin'))
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id`,
      ['Admin User', 'admin@servanta.com', adminPassword, '9999999999']
    );
    if (adminResult.rows.length > 0) {
      console.log('Admin user seeded: admin@servanta.com / admin123');
    }

    // Seed a demo Merchant User
    const merchantPassword = await bcrypt.hash('merchant123', 10);
    const merchantUserResult = await pool.query(
      `INSERT INTO users (name, email, password, phone, role_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'Merchant'))
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id`,
      ['Priya Sharma', 'priya@servanta.com', merchantPassword, '9876543210']
    );
    if (merchantUserResult.rows.length > 0) {
      const merchantUserId = merchantUserResult.rows[0].user_id;
      const merchantResult = await pool.query(
        `INSERT INTO merchants (user_id, business_name, description, category_id, address, approval_status)
         VALUES ($1, $2, $3, (SELECT category_id FROM categories WHERE category_name = 'Beauty Services'), $4, 'Approved')
         ON CONFLICT (user_id) DO NOTHING
         RETURNING merchant_id`,
        [merchantUserId, 'Glamour Studio', 'Premium beauty and hair salon in the heart of the city.', '42 MG Road, Bangalore']
      );
      if (merchantResult.rows.length > 0) {
        const merchantId = merchantResult.rows[0].merchant_id;
        // Seed Services for this merchant
        const services = [
          { name: 'Haircut & Styling', desc: 'Professional haircut with blow-dry and styling', price: 500, duration: 45 },
          { name: 'Facial Treatment', desc: 'Deep cleansing facial with premium products', price: 1200, duration: 60 },
          { name: 'Bridal Makeup', desc: 'Full bridal makeup package with trial session', price: 15000, duration: 180 },
        ];
        for (const svc of services) {
          await pool.query(
            `INSERT INTO services (merchant_id, service_name, description, price, duration) VALUES ($1, $2, $3, $4, $5)`,
            [merchantId, svc.name, svc.desc, svc.price, svc.duration]
          );
        }
        console.log('Merchant (Glamour Studio) and services seeded: priya@servanta.com / merchant123');
      }
    }

    // Seed a demo Customer User
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customerUserResult = await pool.query(
      `INSERT INTO users (name, email, password, phone, role_id)
       VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE role_name = 'Customer'))
       ON CONFLICT (email) DO NOTHING
       RETURNING user_id`,
      ['Rahul Verma', 'rahul@servanta.com', customerPassword, '9123456789']
    );
    if (customerUserResult.rows.length > 0) {
      await pool.query(
        'INSERT INTO customers (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
        [customerUserResult.rows[0].user_id]
      );
      console.log('Customer seeded: rahul@servanta.com / customer123');
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    pool.end();
  }
};

seedData();
