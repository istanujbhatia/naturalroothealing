import type { ErrorRequestHandler, RequestHandler } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const logger = req.log;
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? error.message : 'An unexpected server error occurred';

  if (statusCode >= 500) {
    logger.error({ err: error, requestId: req.id }, 'Request failed');
  } else {
    logger.warn({ code, requestId: req.id }, message);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: req.id,
    },
  });
};
