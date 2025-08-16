import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../controllers';
import { AuthService, EmailService } from '../services';
import { JwtStrategy } from '../auth';
import { User, EmailCode, UserSession, LoginLog } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailCode, UserSession, LoginLog]),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy],
  exports: [AuthService, EmailService],
})
export class AuthModule {}