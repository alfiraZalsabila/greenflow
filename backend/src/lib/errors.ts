import {
  ERROR_CODES,
  ERROR_MESSAGES,
  type ErrorCode,
} from "@greenflow/shared";

export interface ErrorDetail {
  field?: string;
  issue: string;
}

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  [ERROR_CODES.E01]: 500,
  [ERROR_CODES.E02]: 401,
  [ERROR_CODES.E03]: 403,
  [ERROR_CODES.E04]: 401,
  [ERROR_CODES.E05]: 503,
  [ERROR_CODES.E06]: 503,
  [ERROR_CODES.E07]: 400,
  [ERROR_CODES.E08]: 409,
  [ERROR_CODES.AUTH_REQUIRED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.INTERNAL]: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(
    code: ErrorCode,
    options: {
      status?: number;
      message?: string;
      details?: ErrorDetail[];
      cause?: unknown;
    } = {},
  ) {
    super(options.message ?? ERROR_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.details = options.details;
  }

  static badRequest(details?: ErrorDetail[], message?: string): AppError {
    return new AppError(ERROR_CODES.E07, { details, message });
  }

  static unauthorized(code: ErrorCode = ERROR_CODES.AUTH_REQUIRED): AppError {
    return new AppError(code);
  }

  static forbidden(): AppError {
    return new AppError(ERROR_CODES.FORBIDDEN);
  }

  static notFound(message?: string): AppError {
    return new AppError(ERROR_CODES.NOT_FOUND, { message });
  }

  static conflict(message?: string): AppError {
    return new AppError(ERROR_CODES.E08, { message });
  }

  static rateLimited(message?: string): AppError {
    return new AppError(ERROR_CODES.RATE_LIMITED, { message });
  }

  static serviceUnavailable(message?: string): AppError {
    return new AppError(ERROR_CODES.E06, { message });
  }

  static internal(cause?: unknown): AppError {
    return new AppError(ERROR_CODES.INTERNAL, { cause });
  }
}
