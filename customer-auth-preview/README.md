# Isolated customer email authentication preview

This is **test-only**. The managed Better Auth backend is on the isolated Neon branch `customer-auth-staging`, not the production branch. It uses OTP verification, and the shared mail sender is development-only.

Build using Node 22 and `npm install --save-exact @neon/auth vite`, then `VITE_NEON_AUTH_URL=<staging Auth URL> npx vite build`. Review the generated dependency lock and test before deploying. Only the exact Render origin is trusted; no third-party CDN script on a password page. Host the resulting HTML and assets on that origin after verification. Never store or log passwords or OTPs. The client does not grant order/download authorization. Production requires the application's server-side session and ownership checks, a production email sender and password-reset flow, verified end-to-end testing, and approved checkout. Guest checkout remains the existing simulated cart. Google remains a separate disabled-by-default smoke test until the secret is rotated.

Test checklist: sign up with an owner-controlled test address, receive and verify OTP, wrong/expired OTP rejection, sign out, sign in, reload session, wrong password handling, test account isolation, password reset implementation and test before production. No real customer information yet.
