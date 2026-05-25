import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // No baseURL — better-auth uses window.location.origin automatically in the browser
  plugins: [adminClient()],
});
