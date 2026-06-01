import { SetMetadata } from '@nestjs/common';

export enum Role {
  WORKER = 'WORKER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);