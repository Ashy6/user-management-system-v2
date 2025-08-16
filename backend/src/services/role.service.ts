import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Role, User } from '../entities';

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissions?: Record<string, string[]>;
  isActive?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: Record<string, string[]>;
  isActive?: boolean;
}

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async findActive(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { name },
    });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, description, permissions = {}, isActive = true } = createRoleDto;

    // 检查角色名是否已存在
    const existingRole = await this.findByName(name);
    if (existingRole) {
      throw new ConflictException('角色名已存在');
    }

    const role = this.roleRepository.create({
      name,
      description,
      permissions,
      isActive,
    });

    const savedRole = await this.roleRepository.save(role);
    this.logger.log(`Role created: ${savedRole.name}`);

    return savedRole;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    // 如果要更新角色名，检查是否与其他角色冲突
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.findByName(updateRoleDto.name);
      if (existingRole) {
        throw new ConflictException('角色名已存在');
      }
    }

    Object.assign(role, updateRoleDto);
    const updatedRole = await this.roleRepository.save(role);

    this.logger.log(`Role updated: ${updatedRole.name}`);
    return updatedRole;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const role = await this.findOne(id);

    // 检查是否有用户使用此角色
    const userCount = await this.userRepository.count({
      where: { roleId: id, deletedAt: IsNull() },
    });

    if (userCount > 0) {
      throw new BadRequestException(`无法删除角色，还有 ${userCount} 个用户正在使用此角色`);
    }

    await this.roleRepository.remove(role);
    this.logger.log(`Role deleted: ${role.name}`);

    return { success: true };
  }

  async updatePermissions(id: string, permissions: Record<string, string[]>): Promise<Role> {
    const role = await this.findOne(id);
    role.permissions = permissions;
    const updatedRole = await this.roleRepository.save(role);

    this.logger.log(`Role permissions updated: ${updatedRole.name}`);
    return updatedRole;
  }

  async toggleStatus(id: string): Promise<Role> {
    const role = await this.findOne(id);
    role.isActive = !role.isActive;
    const updatedRole = await this.roleRepository.save(role);

    this.logger.log(`Role status toggled: ${updatedRole.name} -> ${updatedRole.isActive ? 'active' : 'inactive'}`);
    return updatedRole;
  }

  async getDefaultPermissions(): Promise<Record<string, string[]>> {
    return {
      users: ['read'],
      dashboard: ['read'],
      settings: [],
    };
  }

  async getAvailablePermissions(): Promise<Record<string, string[]>> {
    return {
      users: ['read', 'create', 'update', 'delete'],
      roles: ['read', 'create', 'update', 'delete'],
      dashboard: ['read'],
      settings: ['read', 'update'],
      logs: ['read'],
    };
  }
}