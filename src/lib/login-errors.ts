import { SUPPORT_EMAIL } from "@/lib/brand";

/**
 * Turns an Auth.js sign-in failure into a message that tells the user what
 * happened and what to do next.
 *
 * `error` is the Auth.js error type (the `?error=` param on /login, or
 * `result.error` from signIn with redirect: false). `code` is set only for
 * credential failures, by the CredentialsSignin subclasses in src/lib/auth.ts.
 */
export function loginErrorMessage(error: string | null | undefined, code?: string | null): string | null {
  if (!error) return null;

  if (error === "CredentialsSignin") {
    switch (code) {
      case "captcha":
        return "We couldn't complete the security check. Please wait for it to finish, then try again.";
      case "google_account":
        return "This account signs in with Google. Use the Continue with Google button above.";
      default:
        return "That email and password don't match. Check for typos, or use Forgot password.";
    }
  }

  switch (error) {
    // A Google address with no account is sent to /register by the signIn
    // callback, so none of these mean "no account".
    case "OAuthAccountNotLinked":
      return "This browser was signed in to a different account. Please try Continue with Google again.";
    case "OAuthSignin":
      return "We couldn't start Google sign-in. Please try again.";
    case "OAuthCallbackError":
      return "Google sign-in didn't finish. If you closed the Google window or chose Cancel, just try again.";
    case "AccessDenied":
      return `This account isn't allowed to sign in. If that seems wrong, email ${SUPPORT_EMAIL}.`;
    case "SessionRequired":
      return "Please sign in to continue.";
    case "Configuration":
      return `Sign-in is having a problem on our end. Please try again in a few minutes, or email ${SUPPORT_EMAIL}.`;
    default:
      return `Sign-in didn't work. Please try again, or email ${SUPPORT_EMAIL} if it keeps happening.`;
  }
}
