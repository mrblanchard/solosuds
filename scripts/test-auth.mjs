// First get the CSRF token + capture cookies
const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
const { csrfToken } = await csrfRes.json();
const csrfCookies = csrfRes.headers.getSetCookie?.() ?? csrfRes.headers.get("set-cookie") ?? "";
console.log("CSRF token:", csrfToken);
console.log("Cookies:", csrfCookies);

// Try to sign in, sending the cookies back
const body = new URLSearchParams({
  email: "admin@SoloSuds.dev",
  password: "Admin1234!",
  csrfToken,
  callbackUrl: "http://localhost:3000/dashboard",
  json: "true",
});

const res = await fetch("http://localhost:3000/api/auth/callback/credentials", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Cookie": Array.isArray(csrfCookies) ? csrfCookies.map(c => c.split(";")[0]).join("; ") : csrfCookies.split(",").map(c => c.split(";")[0]).join("; "),
  },
  body: body.toString(),
  redirect: "manual",
});

console.log("Status:", res.status);
console.log("Location:", res.headers.get("location"));
const setCookie = res.headers.getSetCookie?.() ?? res.headers.get("set-cookie");
console.log("Set-Cookie:", setCookie);
const text = await res.text();
if (text) console.log("Body:", text.slice(0, 500));

