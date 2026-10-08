import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  switchCompanySchema,
  type ChangePasswordDto,
  type LoginDto,
  type RefreshTokenDto,
  type SwitchCompanyDto,
} from '@brics/shared';
import { CurrentUser, Public, type JwtPayload } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

// Handlers return the payload raw; ResponseEnvelopeInterceptor adds `{ data }`.
@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/mobile + password' })
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@CurrentUser('sub') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('switch-company')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch the session to another company the user belongs to' })
  async switchCompany(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(switchCompanySchema)) dto: SwitchCompanyDto,
  ) {
    return this.authService.switchCompany(userId, dto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password (revokes all other sessions)' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile and company claims' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
