// src/modules/feed/feed.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('feed')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedController {
  constructor(private feedService: FeedService) {}

  // ─── Feed principal ────────────────────────────────────
  @Public()
  @Get()
  getFeed(
    @CurrentUser() user: any,
    @Query('page') page = 1,
  ) {
    return this.feedService.getFeed(user?.id, +page);
  }

  // ─── Feed par catégorie ────────────────────────────────
  @Public()
  @Get('categorie/:slug')
  getFeedCategorie(
    @Param('slug') slug: string,
    @CurrentUser() user: any,
    @Query('page') page = 1,
  ) {
    return this.feedService.getFeedCategorie(slug, user?.id, +page);
  }

  // ─── Tendances ─────────────────────────────────────────
  @Public()
  @Get('tendances')
  getTendances() {
    return this.feedService.getTendances();
  }

  // ─── Similaires ────────────────────────────────────────
  @Public()
  @Get('similaires/:id')
  getSimilaires(
    @Param('id') id: string,
    @Query('limit') limit = 6,
  ) {
    return this.feedService.getSimilaires(id, +limit);
  }

  // ─── Recherche ─────────────────────────────────────────
  @Public()
  @Get('recherche')
  rechercher(
    @Query('q') query: string,
    @CurrentUser() user: any,
  ) {
    return this.feedService.rechercher(query, user?.id);
  }
}