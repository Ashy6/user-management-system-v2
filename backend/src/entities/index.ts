import { User } from './user.entity';
import { Role } from './role.entity';
import { UserSession } from './user-session.entity';
import { EmailCode } from './email-code.entity';
import { LoginLog } from './login-log.entity';
import { Setting } from './setting.entity';

export { User, UserStatus } from './user.entity';
export { Role } from './role.entity';
export { UserSession } from './user-session.entity';
export { EmailCode, EmailCodeType } from './email-code.entity';
export { LoginLog, LoginStatus } from './login-log.entity';
export { Setting, SettingType } from './setting.entity';

// 实体类数组，用于TypeORM配置
export const entities = [User, Role, UserSession, EmailCode, LoginLog, Setting];
