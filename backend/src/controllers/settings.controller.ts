import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, PermissionsGuard } from '../auth';
import { SettingsService } from '../services/settings.service';
import { SettingsDto, UpdateSettingsDto } from '../dto/settings.dto';

@ApiTags('系统设置')
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions({ resource: 'settings', action: 'read' })
  @ApiOperation({ summary: '获取系统设置' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取系统设置成功',
    type: SettingsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '权限不足',
  })
  async getSettings(): Promise<SettingsDto> {
    this.logger.log('Getting system settings');
    return this.settingsService.getSettings();
  }

  @Put()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @RequirePermissions({ resource: 'settings', action: 'update' })
  @ApiOperation({ summary: '更新系统设置' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新系统设置成功',
    type: SettingsDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '权限不足',
  })
  async updateSettings(
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsDto> {
    this.logger.log('Updating system settings');
    return this.settingsService.updateSettings(updateSettingsDto);
  }
}