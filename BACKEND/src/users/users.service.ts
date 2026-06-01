import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async findByEmail(email: string) {
    const result = await this.dataSource.query(
      `SELECT * FROM users WHERE email = $1 AND is_active = true`,
      [email]
    );
    return result[0] || null;
  }

  async findById(userId: number) {
    const result = await this.dataSource.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [userId]
    );
    return result[0] || null;
  }

  async updateLastLogin(userId: number) {
    await this.dataSource.query(
      `UPDATE users SET last_login_at = NOW() WHERE user_id = $1`,
      [userId]
    );
  }
}