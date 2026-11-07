import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateVisitDto } from './dto/create-visit.dto.js';
import { HistoryQueryDto } from './dto/history-query.dto.js';
import { VisitsService } from './visits.service.js';

@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  create(@Body() dto: CreateVisitDto) {
    return this.visitsService.create(dto);
  }

  @Get('history/:personId')
  history(
    @Param('personId') personId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.visitsService.history(personId, query.limit);
  }
}
