import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as userModel from '../models/userModel.js';

const BCRYPT_ROUNDS = 12;

// ── Helpers ───────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ── Service methods ───────────────────────────────────────────

export async function register(data) {
  // Check for existing email
  const existing = await userModel.findByEmail(data.email);
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const userId = await userModel.createUser({
    name:         data.name,
    email:        data.email,
    passwordHash,
    role:         data.role,
    roll_no:      data.roll_no,
    department:   data.department,
    semester:     data.semester,
  });

  const user = await userModel.findById(userId);

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login({ email, password }) {
  // Always find user first — prevents timing attacks from early return
  const user = await userModel.findByEmail(email);

  // Compare even if user not found (dummy hash) to prevent user enumeration
  const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000';
  const hash = user?.password_hash ?? dummyHash;

  const isValid = await bcrypt.compare(password, hash);

  if (!user || !isValid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (!user.is_active) {
    throw AppError.forbidden('Your account has been deactivated. Contact admin.');
  }

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await userModel.findById(payload.sub);
  if (!user || !user.is_active) {
    throw AppError.unauthorized('User not found or deactivated');
  }

  const newAccessToken  = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user); // rotate refresh token

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userModel.findByEmail(
    (await userModel.findById(userId)).email
  );

  // Need password_hash — findByEmail includes it
  const userWithHash = await userModel.findByEmail(user.email);
  const isValid = await bcrypt.compare(currentPassword, userWithHash.password_hash);
  if (!isValid) {
    throw AppError.badRequest('Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await userModel.updatePassword(userId, newHash);
}

export async function getProfile(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw AppError.notFound('User');
  return sanitizeUser(user);
}
