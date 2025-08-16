import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../entities';

export class UserResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '邮箱地址' })
  email: string;

  @ApiProperty({ description: '用户姓名' })
  name: string;

  @ApiProperty({ description: '头像URL', required: false })
  avatarUrl?: string;

  @ApiProperty({ description: '手机号码', required: false })
  phone?: string;

  @ApiProperty({ enum: UserStatus, description: '用户状态' })
  status: UserStatus;

  @ApiProperty({ description: '用户角色', required: false })
  role?: {
    id: string;
    name: string;
    description?: string;
  };
}

export class AuthResultDto {
  @ApiProperty({ type: UserResponseDto, description: '用户信息' })
  user: UserResponseDto;

  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;
}

export class UserListResultDto {
  @ApiProperty({ type: [UserResponseDto], description: '用户列表' })
  users: UserResponseDto[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;
}