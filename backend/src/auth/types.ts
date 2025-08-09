import { User } from '@prisma/client';

export type AuthenticatedUser = Omit<User, 'password'>;

export interface JwtPayload {
  sub: string;
  username: string;
}
