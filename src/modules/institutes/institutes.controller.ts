import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import * as express from 'express';
import { InstituteService } from './institutes.service';
import { GetInstitutesQueryDto } from './dto/get-institutes-query.dto';

@Controller('institutes')
export class InstituteController {
  constructor(private readonly instituteService: InstituteService) {}

  /**
   * GET /institutes/filter-data
   * Get filter data for institutes (states, institute types, etc.)
   * This is a public endpoint - no authentication required
   */
  @Get('filter-data')
  @HttpCode(HttpStatus.OK)
  async getFilterData() {
    return await this.instituteService.getFilterData();
  }

  /**
   * GET /institutes
   * Get list of institutes with optional filters
   * Query Parameters:
   *   - states: string (optional) - Filter by states
   *   - institute_type: string (optional) - Filter by institute type
   *   - university_id: number (optional) - Filter by university ID
   *   - page: number (optional, default: 1) - Pagination page number
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getInstitutes(@Query() queryDto: GetInstitutesQueryDto) {
    return await this.instituteService.getInstitutes(queryDto);
  }

  /**
   * GET /institutes/assets/*path
   * Fetch an institute asset from Zynerd with disk caching (served cleanly under /assets/)
   */
  @Get('assets/*path')
  async getAsset(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const reqUrl = req.originalUrl || req.url;
    const prefix = '/institutes/assets/';
    const idx = reqUrl.indexOf(prefix);
    let pathStr = '';
    if (idx !== -1) {
      pathStr = reqUrl.substring(idx + prefix.length);
    } else {
      const p = (req.params as any).path || (req.params as any)[0] || '';
      pathStr = Array.isArray(p) ? p.join('/') : p;
    }

    const resource = await this.instituteService.proxyResource(pathStr);
    if (resource.contentType) {
      res.set('Content-Type', resource.contentType);
    }
    res.send(resource.data);
  }

  /**
   * GET /institutes/proxy
   * Proxy a resource from Zynerd
   * Query Parameter:
   *   - path: string - The path to the resource on public.zynerd.com
   */
  @Get('proxy')
  async proxy(@Query('path') path: string, @Res() res: express.Response) {
    const resource = await this.instituteService.proxyResource(path);
    if (resource.contentType) {
      res.set('Content-Type', resource.contentType);
    }
    res.send(resource.data);
  }

  /**
   * GET /institutes/:id/photos/:filename
   * Clean RESTful endpoint to fetch gallery photo for an institute
   */
  @Get(':id/photos/:filename')
  async getPhoto(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: express.Response,
  ) {
    const instituteId = parseInt(id, 10);
    const resource = await this.instituteService.getInstitutePhoto(
      instituteId,
      filename,
    );
    if (resource.contentType) {
      res.set('Content-Type', resource.contentType);
    }
    res.send(resource.data);
  }

  /**
   * GET /institutes/:id
   * Get detailed information about a specific institute
   * Path Parameter:
   *   - id: number - Institute ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getInstituteDetails(@Param('id') id: string) {
    const instituteId = parseInt(id, 10);
    return await this.instituteService.getInstituteDetails(instituteId);
  }
}
