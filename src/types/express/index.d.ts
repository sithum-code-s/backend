export interface AuthUser {
  id: string;
  email?: string;
}

export interface DbUserSnapshot {
  id: string;
  email: string;
  isAdmin: boolean;
  isTraveller: boolean;
  isMerchant: boolean;
  status: "active" | "suspended";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | null;
      userId?: string | null;
      merchantProfileId?: string;
      dbUser?: DbUserSnapshot | null;
    }
  }
}

export {};