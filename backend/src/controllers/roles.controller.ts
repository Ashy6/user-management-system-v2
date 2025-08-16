import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService, CreateRoleDto, UpdateRoleDto } from '../services';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard } from '../auth';
import { Role } from '../entities';

@ApiTags('角色管理')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions({ resource: 'roles', action: 'read' })
  @ApiOperation({ summary: '获取角色列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [Role] })
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get('active')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  @ApiOperation({ summary: '获取活跃角色列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [Role] })
  async findActive(): Promise<Role[]> {
    return this.roleService.findActive();
  }

  @Get('permissions')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  @ApiOperation({ summary: '获取可用权限列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAvailablePermissions(): Promise<Record<string, string[]>> {
    return this.roleService.getAvailablePermissions();
  }

  @Get(':id')
  @RequirePermissions({ resource: 'roles', action: 'read' })
  @ApiOperation({ summary: '获取角色详情' })
  @ApiResponse({ status: 200, description: '获取成功', type: Role })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @Post()
  @RequirePermissions({ resource: 'roles', action: 'create' })
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 201, description: '创建成功', type: Role })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '角色名已存在' })
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.roleService.create(createRoleDto);
  }

  @Patch(':id')
  @RequirePermissions({ resource: 'roles', action: 'update' })
  @ApiOperation({ summary: '更新角色信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: Role })
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 409, description: '角色名已存在' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.update(id, updateRoleDto);
  }

  @Patch(':id/permissions')
  @RequirePermissions({ resource: 'roles', action: 'update' })
  @ApiOperation({ summary: '更新角色权限' })
  @ApiResponse({ status: 200, description: '更新成功', type: Role })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('permissions') permissions: Record<string, string[]>,
  ): Promise<Role> {
    return this.roleService.updatePermissions(id, permissions);
  }

  @Patch(':id/toggle-status')
  @RequirePermissions({ resource: 'roles', action: 'update' })
  @ApiOperation({ summary: '切换角色状态' })
  @ApiResponse({ status: 200, description: '更新成功', type: Role })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
    return this.roleService.toggleStatus(id);
  }

  @Delete(':id')
  @RequirePermissions({ resource: 'roles', action: 'delete' })
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 400, description: '角色正在被使用，无法删除' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean }> {
    return this.roleService.remove(id);
  }
}