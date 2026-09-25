import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRecord } from './db.ts';
import { supabaseDb } from './supabaseDb.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'mr-felix-auth-secret-key-2026';

export interface AuthPayload {
  userId: string;
  role: 'admin' | 'user';
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function generateToken(user: UserRecord): string {
  const payload: AuthPayload = {
    userId: user.id,
    role: user.role,
    username: user.username,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await supabaseDb.getUserById(decoded.userId);
    if (user && !user.isBanned) {
      req.user = user;
    }
  } catch (err) {
    // Ignore invalid token in optionalAuth
  }
  next();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in or create an account to continue.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await supabaseDb.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User session is invalid. Please log in again.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been suspended.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin' || req.user.email.toLowerCase() !== 'nworkaebube@gmail.com') {
      return res.status(403).json({ error: 'Access denied: Admin panel is restricted to nworkaebube@gmail.com.' });
    }
    next();
  });
}

