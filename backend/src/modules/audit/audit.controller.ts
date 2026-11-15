import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(user.id, user.role, query);
  }

  @Get('summary')
  async getSummary(
    @CurrentUser() user: any,
    @Query('organizationId') orgId?: string
  ) {
    return this.auditService.getSummary(user.id, user.role, orgId);
  }

  @Get('export')
  async exportCsv(
    @CurrentUser() user: any,
    @Query('organizationId') orgId: string | undefined,
    @Res() res: any
  ) {
    const csvContent = await this.auditService.exportCsv(user.id, user.role, orgId);
    res.header('Content-Type', 'text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename="yoyo-audit-log-${Date.now()}.csv"`
    );
    return res.send(csvContent);
  }

  @Post()
  async logManualEvent(
    @CurrentUser() user: any,
    @Body() dto: CreateAuditLogDto,
    @Req() req: any
  ) {
    return this.auditService.logEvent({
      ...dto,
      userId: user.id,
      actorEmail: user.email,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    });
  }
}
