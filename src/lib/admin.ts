import { auth } from "@/lib/auth";

export const ADMIN_EMAIL = "mrjeremyblanchard@gmail.com";

/** True if the current session belongs to the app owner (Jeremy). */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  return session?.user?.email === ADMIN_EMAIL;
}
