import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { findUserById } from "../models/user.js";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "eventforge-secret-change-me";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export function generateToken(user: { id: string; email: string; role: string; name: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): { userId: string; email: string; role: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string; name: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  const token = header.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Optionally fetch full user from DB
  const user = decoded;
  req.user = user;
  next();
}

export type Role = "admin" | "organizer" | "staff" | "speaker" | "attendee" | "sponsor";

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: `Role '${req.user.role}' not authorized. Required: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = header.split(" ")[1];
  const decoded = verifyToken(token);
  if (decoded) {
    req.user = decoded;
  }
  next();
}
