import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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

  /**
   * Ten attempts a minute per address (P13.1). A kiln office is a handful of
   * people who know their password; anyone needing more than ten tries a
   * minute is guessing, and an ERP holding a company's books is worth
   * guessing at. Deliberately not a per-account lockout: that lets anyone who
   * knows an email address lock a real user out.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/mobile + password' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    return this.authService.login(dto, { ipAddress, userAgent });
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
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
  async logout(@CurrentUser('sub') userId: string, @CurrentUser('companyId') companyId: string) {
    return this.authService.logoutAndAudit(userId, companyId);
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
