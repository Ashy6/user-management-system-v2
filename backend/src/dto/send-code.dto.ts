import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmailCodeType } from '../entities';

export class SendCodeDto {
  @ApiProperty({ description: '邮箱地址', example: 'user@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    enum: EmailCodeType,
    description: '验证码类型',
    example: EmailCodeType.LOGIN,
  })
  @IsEnum(EmailCodeType, { message: '验证码类型无效' })
  @IsNotEmpty({ message: '验证码类型不能为空' })
  type: EmailCodeType;
}
