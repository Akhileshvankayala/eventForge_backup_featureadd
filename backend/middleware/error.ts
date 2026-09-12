import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Server error:", err);
  if ((err as any)?.code === 11000) {
    res.status(409).json({ error: "Duplicate entry: this record already exists." });
    return;
  }
  const status = (err as any).status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}
