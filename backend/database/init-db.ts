import fs from 'fs';
import path from 'path';
import pool from '../config/db';

const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema', '01_init.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    
    console.log('Executing schema initialization...');
    await pool.query(sql);

    const migrationPath = path.join(__dirname, 'schema', '02_add_razorpay_fields.sql');
    if (fs.existsSync(migrationPath)) {
      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
      await pool.query(migrationSql);
      console.log('Migration 02 applied.');
    }

    const migration03Path = path.join(__dirname, 'schema', '03_create_favorites.sql');
    if (fs.existsSync(migration03Path)) {
      const migration03Sql = fs.readFileSync(migration03Path, 'utf-8');
      await pool.query(migration03Sql);
      console.log('Migration 03 applied.');
    }

    const migration04Path = path.join(__dirname, 'schema', '04_add_refund_and_audit_logs.sql');
    if (fs.existsSync(migration04Path)) {
      const migration04Sql = fs.readFileSync(migration04Path, 'utf-8');
      await pool.query(migration04Sql);
      console.log('Migration 04 applied (refund fields + audit_logs).');
    }

    const migration05Path = path.join(__dirname, 'schema', '05_phase16_production.sql');
    if (fs.existsSync(migration05Path)) {
      const migration05Sql = fs.readFileSync(migration05Path, 'utf-8');
      await pool.query(migration05Sql);
      console.log('Migration 05 applied (email_log + payment_events + full-text search).');
    }
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    pool.end();
  }
};

initDb();
