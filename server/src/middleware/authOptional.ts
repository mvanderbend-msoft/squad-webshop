import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

/**
 * Optional auth: if a valid Bearer token is present, sets req.user.
 * If no token or token is invalid, calls next() with req.user undefined
 * (does NOT 401). Use for public endpoints that personalize responses
 * for authenticated callers (e.g. injecting isFavorited on products).
 */
export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = { id: payload.id, email: payload.email };
  } catch {
    // ignore invalid tokens — treat as guest
  }
  next();
}
