import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { RequestsModule } from './requests/requests.module';
import { UsersModule } from './users/users.module';
import { ScanModule } from './scan/scan.module';
import { HealthController } from './health.controller';
import * as fs from 'fs';
import * as path from 'path';

const sslEnabled =
  (process.env.BETA_DB_SSL ||
    process.env.PRD_DB_SSL ||
    process.env.DB_SSL) === 'true';

const sslCaPath =
  process.env.BETA_DB_SSL_CA ||
  process.env.PRD_DB_SSL_CA ||
  process.env.DB_SSL_CA;
@Module({
  imports: [
    // Load .env file
    ConfigModule.forRoot({ isGlobal: true }),

    // Database connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host:
        process.env.BETA_DB_HOST ||
        process.env.PRD_DB_HOST ||
        process.env.DB_HOST ||
        'localhost',

      port: parseInt(
        process.env.BETA_DB_PORT ||
        process.env.PRD_DB_PORT ||
        process.env.DB_PORT ||
        '5432'
      ),

      username:
        process.env.BETA_DB_USERNAME ||
        process.env.PRD_DB_USERNAME ||
        process.env.DB_USERNAME ||
        'postgres',

      password:
        process.env.BETA_DB_PASSWORD ||
        process.env.PRD_DB_PASSWORD ||
        process.env.DB_PASSWORD ||
        'admin@123',

      database:
        process.env.BETA_DB_NAME ||
        process.env.PRD_DB_NAME ||
        process.env.DB_NAME ||
        'robot_tracking',
    }),

    // Modules
    AuthModule,
    RequestsModule,
    UsersModule,
    ScanModule,
  ],

  
  controllers: [HealthController],
})
export class AppModule {}