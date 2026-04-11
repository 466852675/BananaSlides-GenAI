import { UserRole, UserStatus } from '../types/user.types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
        username: string | null;
        nickname: string | null;
        role: UserRole;
        status: UserStatus;
        points: number;
        vipLevel?: number;
        avatar?: string | null;
        name?: string | null;
      };
    }

    interface Response {
      deductedPoints?: number;
      transactionId?: string;
    }
  }
}

export {};
