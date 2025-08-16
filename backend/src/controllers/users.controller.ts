import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  UserService,
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserListResult,
} from '../services';
import { UserListResultDto } from '../dto/auth-response.dto';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard } from '../auth';
import { User, UserStatus } from '../entities';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions({ resource: 'users', action: 'read' })
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '搜索关键词' })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus, description: '用户状态' })
  @ApiQuery({ name: 'roleId', required: false, type: String, description: '角色ID' })
  @ApiResponse({ status: 200, description: '获取成功', type: UserListResultDto })
  async findAll(@Query() query: UserQueryDto): Promise<UserListResult> {
    return this.userService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions({ resource: 'users', action: 'read' })
  @ApiOperation({ summary: '获取用户统计信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStatistics() {
    return this.userService.getStatistics();
  }

  @Get(':id')
  @RequirePermissions({ resource: 'users', action: 'read' })
  @ApiOperation({ summary: '获取用户详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Post()
  @RequirePermissions({ resource: 'users', action: 'create' })
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({ status: 201, description: '创建成功', type: User })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '邮箱已被使用' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'users', action: 'update' })
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @RequirePermissions({ resource: 'users', action: 'update' })
  @ApiOperation({ summary: '更新用户状态' })
  @ApiResponse({ status: 200, description: '更新成功', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: UserStatus,
  ): Promise<User> {
    return this.userService.updateStatus(id, status);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'users', action: 'delete' })
  @ApiOperation({ summary: '删除用户' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    return this.userService.remove(id);
  }
}