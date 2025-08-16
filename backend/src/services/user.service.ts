import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, MoreThan } from 'typeorm';
import { User, UserStatus, Role } from '../entities';

export interface CreateUserDto {
  email: string;
  name: string;
  phone?: string;
  roleId?: string;
  status?: UserStatus;
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  roleId?: string;
  status?: UserStatus;
}

export interface UserQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  roleId?: string;
}

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async findAll(query: UserQueryDto): Promise<UserListResult> {
    const { page = 1, limit = 10, search, status, roleId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where({ deletedAt: IsNull() });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 角色筛选
    if (roleId) {
      queryBuilder.andWhere('user.roleId = :roleId', { roleId });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
      relations: ['role'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, name, phone, roleId, status = UserStatus.ACTIVE } = createUserDto;

    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });

    if (existingUser) {
      throw new ConflictException('该邮箱已被使用');
    }

    // 验证角色是否存在
    if (roleId) {
      const role = await this.roleRepository.findOne({ where: { id: roleId } });
      if (!role) {
        throw new BadRequestException('指定的角色不存在');
      }
    }

    const user = this.userRepository.create({
      email,
      name,
      phone,
      roleId,
      status,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`User created: ${savedUser.email}`);

    return this.findOne(savedUser.id);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // 验证角色是否存在
    if (updateUserDto.roleId) {
      const role = await this.roleRepository.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (!role) {
        throw new BadRequestException('指定的角色不存在');
      }
    }

    // 更新用户信息
    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`User updated: ${updatedUser.email}`);
    return this.findOne(updatedUser.id);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findOne(id);
    user.status = status;
    const updatedUser = await this.userRepository.save(user);

    this.logger.log(`User status updated: ${updatedUser.email} -> ${status}`);
    return updatedUser;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const user = await this.findOne(id);
    
    // 软删除
    user.deletedAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User deleted: ${user.email}`);
    return { success: true };
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    recentRegistrations: number;
  }> {
    const [total, active, inactive, suspended] = await Promise.all([
      this.userRepository.count({ where: { deletedAt: IsNull() } }),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE, deletedAt: IsNull() } }),
      this.userRepository.count({ where: { status: UserStatus.INACTIVE, deletedAt: IsNull() } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED, deletedAt: IsNull() } }),
    ]);

    // 最近7天注册的用户数
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await this.userRepository.count({
      where: {
        createdAt: MoreThan(sevenDaysAgo),
        deletedAt: IsNull(),
      },
    });

    return {
      total,
      active,
      inactive,
      suspended,
      recentRegistrations,
    };
  }
}