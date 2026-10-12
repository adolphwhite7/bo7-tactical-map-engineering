/**
 * crashReporter.ts
 *
 * Lightweight JS crash reporter that forwards unhandled errors and React
 * boundary crashes to Firebase Analytics as custom events.
 *
 * This is the interim solution while the app ships via Expo Go / JS-SDK-only.
 * Crash events appear in Firebase Analytics under Custom Events as "app_crash".
 *
 * ── Upgrade path to real Crashlytics ────────────────────────────────────────
 * Once your EAS build pipeline is active:
 *   1. npm install @react-native-firebase/app @react-native-firebase/crashlytics
 *   2. Add google-services.json (Android) and GoogleService-Info.plist (iOS)
 *   3. Add to app.json plugins:
 *        "@react-native-firebase/app",
 *        "@react-native-firebase/crashlytics"
 *   4. Replace logAnalyticsEvent calls below with:
 *        import crashlytics from "@react-native-firebase/crashlytics";
 *        crashlytics().recordError(error);
 * ────────────────────────────────────────────────────────────────────────────
 */

import { Platform } from "react-native";
import { logAnalyticsEvent } from "@/config/firebase";

const MAX_MESSAGE_LENGTH = 200;
const MAX_STACK_LENGTH = 500;

function truncate(str: string | undefined, max: number): string {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function buildCrashPayload(
  error: Error,
  context: string,
  stackTrace?: string
): Record<string, string> {
  return {
    crash_context: context,
    error_name: error.name ?? "UnknownError",
    error_message: truncate(error.message, MAX_MESSAGE_LENGTH),
    stack_trace: truncate(stackTrace ?? error.stack, MAX_STACK_LENGTH),
    platform: Platform.OS,
    platform_version: String(Platform.Version),
  };
}

/**
 * Call this from ErrorBoundary.onError to report React render crashes.
 */
export function reportBoundaryCrash(
  error: Error,
  componentStack: string
): void {
  const payload = buildCrashPayload(error, "error_boundary", componentStack);
  logAnalyticsEvent("app_crash", payload);
  console.error("[CrashReporter] React boundary crash:", error.message);
}

/**
 * Call this anywhere in the app to report a caught error manually.
 * Equivalent to crashlytics().recordError(error) in the native SDK.
 */
export function recordError(error: Error, context = "manual"): void {
  const payload = buildCrashPayload(error, context);
  logAnalyticsEvent("app_crash", payload);
  console.error(`[CrashReporter] Recorded error (${context}):`, error.message);
}

/**
 * Install global handlers for unhandled promise rejections and uncaught JS errors.
 * Call once from App.tsx before the navigation tree mounts.
 */
export function installGlobalCrashHandlers(): void {
  // Unhandled promise rejections
  const originalHandler = global.onunhandledrejection;
  global.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event?.reason;
    const error =
      reason instanceof Error
        ? reason
        : new Error(String(reason ?? "Unhandled promise rejection"));
    recordError(error, "unhandled_promise_rejection");
    if (typeof originalHandler === "function") {
      originalHandler(event);
    }
  };

  // Uncaught JS errors (React Native global error handler)
  const originalErrorHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
    const payload = {
      ...buildCrashPayload(error, isFatal ? "fatal_js_error" : "js_error"),
      is_fatal: String(isFatal),
    };
    logAnalyticsEvent("app_crash", payload);
    console.error(
      `[CrashReporter] ${isFatal ? "FATAL" : "Non-fatal"} JS error:`,
      error.message
    );
    if (typeof originalErrorHandler === "function") {
      originalErrorHandler(error, isFatal);
    }
  });
}
