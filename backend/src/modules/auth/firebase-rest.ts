import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

interface IdentityToolkitError {
  error?: {
    code?: number;
    message?: string;
  };
}

interface SignInResponse {
  idToken: string;
  localId: string;
  email: string;
}

function restBaseUrl(): string {
  if (env.FIREBASE_USE_EMULATOR && env.FIREBASE_AUTH_EMULATOR_HOST) {
    return `http://${env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
  }
  return "https://identitytoolkit.googleapis.com/v1";
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${restBaseUrl()}${path}?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw AppError.serviceUnavailable();
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as
      | IdentityToolkitError
      | undefined;
    const message = payload?.error?.message ?? "UNKNOWN";
    throw new FirebaseRestError(message);
  }

  return (await response.json()) as T;
}

export class FirebaseRestError extends Error {
  constructor(readonly identityMessage: string) {
    super(identityMessage);
    this.name = "FirebaseRestError";
  }
}

/** Login lewat REST Firebase Auth; kata sandi tidak disimpan Express. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResponse> {
  return post<SignInResponse>("/accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
}

/** Kirim email reset kata sandi. Respons selalu disamarkan oleh pemanggil. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  await post("/accounts:sendOobCode", {
    requestType: "PASSWORD_RESET",
    email,
  });
}
