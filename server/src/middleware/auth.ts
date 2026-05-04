import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth: if a valid Bearer token is present, populate req.user; otherwise
// continue anonymously without erroring. Used by endpoints that change shape for
// authenticated users (e.g. injecting `isFavorited` into product responses) but
// must remain accessible to guests.
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
    // ignore — treat as unauthenticated
  }
  next();
}
