import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GstController } from './gst.controller';
import { GstService } from './gst.service';

@Module({
  imports: [AuthModule],
  controllers: [GstController],
  providers: [GstService],
  exports: [GstService],
})
export class GstModule {}
