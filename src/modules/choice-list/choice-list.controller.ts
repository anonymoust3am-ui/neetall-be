import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChoiceListService } from './choice-list.service';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateChoiceListDto,
  UpdateChoiceListDto,
  CreateChoiceListDetailDto,
  UpdateChoiceListDetailDto,
  ChoiceListQueryDto,
} from './dto/choice-list.dto';

@Controller('choice-lists')
@UseGuards(AuthGuard)
export class ChoiceListController {
  constructor(private readonly choiceListService: ChoiceListService) {}

  // ========================
  // 📋 CHOICE LIST ENDPOINTS
  // ========================

  /**
   * POST /choice-lists
   * Create a new choice list (with optional inline details)
   */
  @Post()
  async create(@Req() req: any, @Body() body: CreateChoiceListDto) {
    return this.choiceListService.createChoiceList(req.user.id, body);
  }

  /**
   * GET /choice-lists
   * List all choice lists for the authenticated user
   */
  @Get()
  async findAll(@Req() req: any, @Query() query: ChoiceListQueryDto) {
    return this.choiceListService.getUserChoiceLists(req.user.id, query);
  }

  /**
   * GET /choice-lists/:id
   * Get a single choice list with all details
   */
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.choiceListService.getChoiceListById(req.user.id, id);
  }

  /**
   * PATCH /choice-lists/:id
   * Update a choice list
   */
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateChoiceListDto,
  ) {
    return this.choiceListService.updateChoiceList(req.user.id, id, body);
  }

  /**
   * DELETE /choice-lists/:id
   * Delete a choice list and all its details
   */
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.choiceListService.deleteChoiceList(req.user.id, id);
  }

  // ========================
  // 📄 DETAIL ENDPOINTS (nested)
  // ========================

  /**
   * POST /choice-lists/:choiceListId/details
   * Add a detail entry to a choice list
   */
  @Post(':choiceListId/details')
  async addDetail(
    @Req() req: any,
    @Param('choiceListId') choiceListId: string,
    @Body() body: CreateChoiceListDetailDto,
  ) {
    return this.choiceListService.addDetail(req.user.id, choiceListId, body);
  }

  /**
   * PATCH /choice-lists/details/:detailId
   * Update a detail entry
   */
  @Patch('details/:detailId')
  async updateDetail(
    @Req() req: any,
    @Param('detailId') detailId: string,
    @Body() body: UpdateChoiceListDetailDto,
  ) {
    return this.choiceListService.updateDetail(req.user.id, detailId, body);
  }

  /**
   * DELETE /choice-lists/details/:detailId
   * Delete a detail entry
   */
  @Delete('details/:detailId')
  async deleteDetail(@Req() req: any, @Param('detailId') detailId: string) {
    return this.choiceListService.deleteDetail(req.user.id, detailId);
  }

  /**
   * PATCH /choice-lists/:choiceListId/reorder
   * Bulk reorder detail entries
   * Body: { orderedIds: ["id1", "id2", ...] }
   */
  @Patch(':choiceListId/reorder')
  async reorderDetails(
    @Req() req: any,
    @Param('choiceListId') choiceListId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.choiceListService.reorderDetails(
      req.user.id,
      choiceListId,
      body.orderedIds,
    );
  }
}
