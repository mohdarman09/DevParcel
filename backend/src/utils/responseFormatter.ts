import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400
): Response {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };
  return res.status(statusCode).json(body);
}
