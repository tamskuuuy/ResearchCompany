import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: any;
  };
}

export function buildErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: any
): NextResponse<ApiErrorPayload> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function handleApiError(error: any, contextStr?: string): NextResponse<ApiErrorPayload> {
  if (contextStr) {
    console.error(`[API ERROR ${contextStr}]:`, error?.message || error);
  } else {
    console.error(`[API ERROR]:`, error?.message || error);
  }

  const message = error?.message || "An unexpected internal error occurred.";
  
  // Mask sensitive database or internal stack trace errors
  const safeMessage = message.includes("PGRST") || message.includes("postgres")
    ? "A database operation failed. Please verify input data and try again."
    : message;

  return buildErrorResponse(500, "INTERNAL_ERROR", safeMessage);
}
