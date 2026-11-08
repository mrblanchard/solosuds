import { loginErrorMessage } from "@/lib/login-errors";

describe("loginErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(loginErrorMessage(null)).toBeNull();
    expect(loginErrorMessage(undefined, "captcha")).toBeNull();
  });

  it("explains a failed security check", () => {
    expect(loginErrorMessage("CredentialsSignin", "captcha")).toMatch(/security check/i);
  });

  it("points Google-only accounts at the Google button", () => {
    expect(loginErrorMessage("CredentialsSignin", "google_account")).toMatch(/Continue with Google/);
  });

  it("falls back to a mismatch message for other credential failures", () => {
    for (const code of [undefined, null, "credentials"]) {
      expect(loginErrorMessage("CredentialsSignin", code)).toMatch(/don't match/i);
    }
  });

  it("never tells a Google user they have no account", () => {
    for (const error of ["OAuthAccountNotLinked", "OAuthSignin", "OAuthCallbackError"]) {
      expect(loginErrorMessage(error)).not.toMatch(/no account/i);
    }
    expect(loginErrorMessage("OAuthAccountNotLinked")).toMatch(/different account/i);
  });

  it("offers a support address for server-side and unknown errors", () => {
    expect(loginErrorMessage("Configuration")).toMatch(/@/);
    expect(loginErrorMessage("SomethingNew")).toMatch(/@/);
  });
});
