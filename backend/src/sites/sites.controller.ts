import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { SearchSitesDto } from './dto/search-sites.dto.js';
import { SitesService } from './sites.service.js';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get('search')
  search(@Query() query: SearchSitesDto) {
    return this.sitesService.search(query.q);
  }

  @Get(':address')
  findByAddress(@Param('address') address: string) {
    return this.sitesService.findByAddress(address);
  }

  @Post()
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }
}
