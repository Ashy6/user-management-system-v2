import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig, getJwtConfig } from './config';
import {
  AuthModule,
  UsersModule,
  RolesModule,
  SettingsModule,
} from './modules';
import { JwtAuthGuard } from './auth';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
      // type: 'postgres', // 数据库类型
      // host: '你的数据库主机', // 如 hexhub 提供的地址
      // port: 5432, // 端口，默认5432
      // username: '你的数据库用户名',
      // password: '你的数据库密码',
      // database: '你的数据库名称',
      // entities: [], // 后续添加实体类路径
      // synchronize: true, // 开发环境下自动同步实体与表结构（生产环境建议关闭）
      // logging: true, // 打印SQL日志（可选）
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
      global: true,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
