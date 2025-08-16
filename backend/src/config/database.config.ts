import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { entities } from '../entities';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'pg-admin'),
  password: configService.get<string>('DB_PASSWORD', 'pgAdmin'),
  database: configService.get<string>('DB_DATABASE', 'email-user'),
  entities: entities,
  synchronize: configService.get<boolean>('DB_SYNCHRONIZE', true),
  logging: configService.get<boolean>('DB_LOGGING', false),
  ssl: configService.get<boolean>('DB_SSL', false)
    ? {
        rejectUnauthorized: false,
      }
    : false,
});
