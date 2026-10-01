import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./db.js";

const secret = process.env.JWT_SECRET || "dev-only-change-me";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, secret, { expiresIn: "7d" });
}

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return required ? res.status(401).json({ error: "Authentication required" }) : next();
    try {
      req.user = jwt.verify(token, secret);
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  };
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
}

export function currentUser(id) {
  return db.prepare("SELECT id,name,email,phone,role,status,created_at FROM users WHERE id=?").get(id);
}
