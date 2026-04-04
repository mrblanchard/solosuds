import { UserRole, PracticeType } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    organizationId?: string;
    practiceType?: PracticeType;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      organizationId?: string;
      practiceType?: PracticeType;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    organizationId?: string;
    practiceType?: PracticeType;
  }
}
