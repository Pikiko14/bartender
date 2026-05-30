import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '@shared/decorators';
import { Permission } from '@shared/enums';
import { AnalyticsService } from '../../application/analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions(Permission.ANALYTICS_VIEW)
  overview(
    @CurrentUser('businessId') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.analytics.overview(businessId, fromDate, toDate);
  }
}
