import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { loginSchema, refreshTokenSchema } from '@brics/shared';
import { CurrentUser, Public, type JwtPayload } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/mobile + password' })
  async login(@Body() body: unknown) {
    const dto = loginSchema.parse(body);
    const data = await this.authService.login(dto);
    return { data };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() body: unknown) {
    const dto = refreshTokenSchema.parse(body);
    const data = await this.authService.refresh(dto);
    return { data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  async logout(@CurrentUser('sub') userId: string) {
    const data = await this.authService.logout(userId);
    return { data };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile and company claims' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return { data: user };
  }
}
