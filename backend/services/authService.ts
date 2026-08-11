import bcrypt from 'bcrypt';
import { query } from '../config/db';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'Merchant' | 'Customer';
}

interface LoginInput {
  email: string;
  password: string;
}

/**
 * Register a new user (Merchant or Customer).
 * Hashes the password, creates the user record, and creates the
 * corresponding Merchant or Customer profile.
 */
export const registerUser = async (input: RegisterInput) => {
  const { name, email, password, phone, role } = input;

  // Check if email already exists
  const existingUser = await query('SELECT user_id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // Get role_id
  const roleResult = await query('SELECT role_id FROM roles WHERE role_name = $1', [role]);
  if (roleResult.rows.length === 0) {
    throw new AppError('Invalid role specified.', 400);
  }
  const roleId = roleResult.rows[0].role_id;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const userResult = await query(
    'INSERT INTO users (name, email, password, phone, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, name, email',
    [name, email, hashedPassword, phone || null, roleId]
  );
  const user = userResult.rows[0];

  // Create role-specific profile
  if (role === 'Customer') {
    await query('INSERT INTO customers (user_id) VALUES ($1)', [user.user_id]);
  }
  // Merchant profile is created separately when they set up their business

  // Generate JWT
  const token = generateToken({ userId: user.user_id, roleId, roleName: role });

  // Send welcome email (non-blocking)
  try {
    const { sendWelcomeEmail } = await import('./emailService');
    await sendWelcomeEmail(user.user_id, user.name, user.email);
  } catch (emailErr) {
    console.error('Email send failed (welcome email):', emailErr);
  }

  return {
    user: { userId: user.user_id, name: user.name, email: user.email, role },
    token,
  };
};

/**
 * Login user with email and password.
 */
export const loginUser = async (input: LoginInput) => {
  const { email, password } = input;

  // Get user with role
  const result = await query(
    `SELECT u.user_id, u.name, u.email, u.password, u.role_id, r.role_name
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password.', 401);
  }

  const user = result.rows[0];

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Generate JWT
  const token = generateToken({
    userId: user.user_id,
    roleId: user.role_id,
    roleName: user.role_name,
  });

  return {
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role_name,
    },
    token,
  };
};

/**
 * Get the currently authenticated user's profile.
 */
export const getCurrentUser = async (userId: number) => {
  const result = await query(
    `SELECT u.user_id, u.name, u.email, u.phone, r.role_name, u.created_at
     FROM users u
     JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found.', 404);
  }

  const user = result.rows[0];

  // If merchant, include merchant details
  if (user.role_name === 'Merchant') {
    const merchantResult = await query(
      `SELECT m.merchant_id, m.business_name, m.description, m.address, m.image, m.approval_status,
              c.category_name
       FROM merchants m
       LEFT JOIN categories c ON m.category_id = c.category_id
       WHERE m.user_id = $1`,
      [userId]
    );
    if (merchantResult.rows.length > 0) {
      user.merchant = merchantResult.rows[0];
    }
  }

  return user;
};
