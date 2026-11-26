export interface ApiErrorBody {
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): never {
  throw new ApiError(400, message, details);
}

export function notFound(message = "Data tidak ditemukan."): never {
  throw new ApiError(404, message);
}

export function conflict(message: string, details?: unknown): never {
  throw new ApiError(409, message, details);
}

export function forbidden(message = "Akses ditolak."): never {
  throw new ApiError(403, message);
}
