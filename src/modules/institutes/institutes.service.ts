import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GetInstitutesQueryDto } from './dto/get-institutes-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';

@Injectable()
export class InstituteService {
  private readonly logger = new Logger(InstituteService.name);
  private readonly baseUrl = 'https://open.zynerd.com/public';
  private readonly timeout = 30000; // 30 seconds
  private readonly httpsAgent = new https.Agent({
    keepAlive: true,
    family: 4, // Force IPv4 to prevent Cloudflare/Cloudfront IPv6 ECONNRESET
    maxSockets: 50,
  });
  private readonly userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  ];

  private readonly cacheDir = path.join(process.cwd(), 'cache', 'institutes');
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private cachedTotal = 1149;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get filter data for institutes (states, types, etc.)
   */
  async getFilterData() {
    try {
      const url = `${this.baseUrl}/institutes/filter_data`;
      this.logger.debug(`Fetching filter data from: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: this.timeout,
        }),
      );

      this.logger.debug(`Filter data fetched successfully`);
      return this.maskUrls(response.data);
    } catch (error) {
      this.logger.error(
        `Error fetching filter data: ${error.message}`,
        error.stack,
      );
      this.handleHttpError(error, 'Failed to fetch filter data');
    }
  }

  /**
   * Get institutes with optional filters
   */
  async getInstitutes(queryDto: GetInstitutesQueryDto) {
    if (queryDto.counselling) {
      try {
        this.logger.debug(
          `Fetching local institutes for counselling: ${queryDto.counselling}`,
        );
        const allotments = await this.prisma.allotmentRecord.findMany({
          where: {
            OR: [
              { counsellingName: queryDto.counselling },
              { sourceCounsellingName: queryDto.counselling },
              { counselling: { name: queryDto.counselling } },
            ],
          },
          select: {
            institute: {
              select: {
                id: true,
                sourceInstituteId: true,
                name: true,
                state: true,
              },
            },
          },
          distinct: ['instituteId'],
        });

        const institutes = allotments
          .map((a) => a.institute)
          .filter(
            (inst): inst is NonNullable<typeof inst> =>
              inst !== null && inst !== undefined,
          )
          .map((inst) => ({
            id: inst.sourceInstituteId
              ? parseInt(inst.sourceInstituteId, 10)
              : inst.id,
            name: inst.name,
            state: inst.state,
          }));

        // Sort by name alphabetically
        institutes.sort((a, b) => a.name.localeCompare(b.name));

        return {
          success: true,
          data: {
            institutes,
            total: institutes.length,
            page_size: institutes.length,
            page: 1,
          },
        };
      } catch (error) {
        this.logger.error(
          `Error querying local institutes for counselling ${queryDto.counselling}: ${error.message}`,
          error.stack,
        );
      }
    }

    try {
      const url = `${this.baseUrl}/institutes`;

      // Build query parameters
      const params: any = {};

      if (queryDto.states) {
        params.states = queryDto.states;
      }

      if (queryDto.institute_type) {
        params.institute_type = queryDto.institute_type;
      }

      if (queryDto.university_id) {
        params.university_id = queryDto.university_id;
      }

      // Map offset/page to Zynerd's offset parameter
      if (queryDto.offset !== undefined && queryDto.offset !== null) {
        params.offset = queryDto.offset;
      } else if (queryDto.page) {
        params.offset = (queryDto.page - 1) * 50;
      } else {
        params.offset = 0;
      }

      this.logger.debug(
        `Fetching institutes from: ${url} with params:`,
        params,
      );

      const response = await firstValueFrom(
        this.httpService.get(url, {
          params,
          timeout: this.timeout,
        }),
      );

      this.logger.debug(`Institutes fetched successfully`);
      const responseData = response.data;
      if (responseData && responseData.data) {
        if (typeof responseData.data.total === 'number') {
          this.cachedTotal = responseData.data.total;
        }

        const currentPage = queryDto.offset !== undefined && queryDto.offset !== null
          ? Math.floor(queryDto.offset / 50) + 1
          : (queryDto.page || 1);

        responseData.data.total = responseData.data.total ?? this.cachedTotal;
        responseData.data.page_size = responseData.data.page_size ?? 50;
        responseData.data.page = currentPage;
      }
      return this.maskUrls(responseData);
    } catch (error) {
      this.logger.error(
        `Error fetching institutes: ${error.message}`,
        error.stack,
      );
      this.handleHttpError(error, 'Failed to fetch institutes');
    }
  }

  /**
   * Get detailed information about a specific institute
   */
  async getInstituteDetails(id: number) {
    try {
      if (!id || id <= 0) {
        throw new HttpException('Invalid institute ID', HttpStatus.BAD_REQUEST);
      }

      const url = `${this.baseUrl}/institutes/${id}/details`;
      this.logger.debug(`Fetching institute details from: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: this.timeout,
        }),
      );

      this.logger.debug(`Institute details fetched successfully for ID: ${id}`);
      return this.maskUrls(response.data);
    } catch (error) {
      this.logger.error(
        `Error fetching institute details for ID ${id}: ${error.message}`,
        error.stack,
      );
      this.handleHttpError(
        error,
        `Failed to fetch institute details for ID ${id}`,
      );
    }
  }

  /**
   * Proxy a resource from Zynerd with retry logic, disk caching, and local asset fallback
   */
  async proxyResource(
    pathStr: string,
    retries = 5,
  ): Promise<{ data: any; contentType: string }> {
    try {
      if (!pathStr) {
        throw new HttpException('Path is required', HttpStatus.BAD_REQUEST);
      }

      const cacheKey = crypto.createHash('md5').update(pathStr).digest('hex');
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.bin`);
      const cacheMetaPath = path.join(this.cacheDir, `${cacheKey}.json`);

      // Check disk cache (30 days cache for images)
      const LONG_CACHE_TTL = 1000 * 60 * 60 * 24 * 30;
      if (fs.existsSync(cacheFilePath) && fs.existsSync(cacheMetaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(cacheMetaPath, 'utf-8'));
          if (Date.now() - meta.timestamp < LONG_CACHE_TTL) {
            this.logger.debug(`Serving from disk cache: ${pathStr}`);
            const data = fs.readFileSync(cacheFilePath);
            return { data, contentType: meta.contentType };
          }
        } catch (e) {
          // ignore cache read error
        }
      }

      const cleanPath = pathStr.startsWith('/')
        ? pathStr.substring(1)
        : pathStr;
      let decodedPath = cleanPath;
      try {
        decodedPath = decodeURI(cleanPath);
      } catch (e) {
        // use raw cleanPath if decode fails
      }
      const url = `https://public.zynerd.com/${encodeURI(decodedPath)}`;
      this.logger.debug(
        `Proxying resource from: ${url} (Retries left: ${retries})`,
      );

      const response = await firstValueFrom(
        this.httpService.get(url, {
          responseType: 'arraybuffer',
          timeout: this.timeout,
          httpsAgent: this.httpsAgent,
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            Accept:
              'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://www.zynerd.com/',
            'Sec-Ch-Ua':
              '"Not_A Brand";v="8", "Chromium";v="121", "Google Chrome";v="121"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Connection: 'keep-alive',
          },
        }),
      );

      const result = {
        data: response.data,
        contentType: (response.headers['content-type'] as string) || 'image/jpeg',
      };

      // Store in disk cache
      try {
        fs.writeFileSync(cacheFilePath, Buffer.from(response.data));
        fs.writeFileSync(
          cacheMetaPath,
          JSON.stringify({
            contentType: result.contentType,
            timestamp: Date.now(),
            originalPath: pathStr,
          }),
        );
      } catch (cacheError) {
        this.logger.error(
          `Failed to write to disk cache: ${cacheError.message}`,
        );
      }

      return result;
    } catch (error) {
      const isConnectionError =
        error.code === 'ECONNRESET' ||
        error.message?.includes('ECONNRESET') ||
        error.code === 'ETIMEDOUT';

      if (retries > 0 && isConnectionError) {
        this.logger.warn(
          `Connection error for ${pathStr} (${error.code || error.message}), retrying... (${retries} left)`,
        );
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (6 - retries)),
        );
        return this.proxyResource(pathStr, retries - 1);
      }

      // Check for local image fallback in data/images/<instituteId>/
      try {
        const cleanPath = pathStr.startsWith('/')
          ? pathStr.substring(1)
          : pathStr;
        const parts = cleanPath.split('/');
        if (parts.length >= 3 && parts[0] === 'institutes') {
          const instituteId = parts[1];
          const instDir = path.join(process.cwd(), 'data', 'images', instituteId);
          if (fs.existsSync(instDir)) {
            const files = fs.readdirSync(instDir);
            const cover =
              files.find((f) => f.startsWith('cover_')) ||
              files.find((f) => f.startsWith('logo_')) ||
              files[0];
            if (cover) {
              this.logger.warn(
                `Proxy failed for ${pathStr}, serving local fallback image: ${cover}`,
              );
              const data = fs.readFileSync(path.join(instDir, cover));
              const ext = path.extname(cover).toLowerCase();
              const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
              return { data, contentType };
            }
          }
        }
      } catch (fallbackError) {
        // ignore fallback failure and throw original error
      }

      this.logger.error(
        `Error proxying resource from ${pathStr}: ${error.message}`,
      );
      if (error.response && error.response.status === 404) {
        throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
      }
      this.handleHttpError(error, 'Failed to proxy resource');
    }
  }

  /**
   * Fetch an institute photo cleanly via photo number or filename
   */
  async getInstitutePhoto(
    instituteId: number,
    filename: string,
  ): Promise<{ data: any; contentType: string }> {
    const cacheKey = `photo_${instituteId}_${filename}`;
    const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.bin`);
    const cacheMetaPath = path.join(this.cacheDir, `${cacheKey}.json`);

    // 1. Check disk cache (30 days cache)
    const LONG_CACHE_TTL = 1000 * 60 * 60 * 24 * 30;
    if (fs.existsSync(cacheFilePath) && fs.existsSync(cacheMetaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(cacheMetaPath, 'utf-8'));
        if (Date.now() - meta.timestamp < LONG_CACHE_TTL) {
          const data = fs.readFileSync(cacheFilePath);
          return { data, contentType: meta.contentType };
        }
      } catch (e) {
        // ignore cache error
      }
    }

    // 2. Locate original Zynerd photo URL from raw unmasked institute details
    let targetZynerdPath: string | null = null;
    const numMatch =
      filename.match(/photo-(\d+)/i) || filename.match(/(\d+)/);
    const photoNum = numMatch ? parseInt(numMatch[1], 10) : null;

    try {
      const url = `${this.baseUrl}/institutes/${instituteId}/details`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: this.timeout,
          httpsAgent: this.httpsAgent,
        }),
      );
      const rawImageUrls: string[] = response.data?.data?.image_urls || [];

      if (photoNum && photoNum <= rawImageUrls.length && photoNum > 0) {
        targetZynerdPath = rawImageUrls[photoNum - 1];
      } else if (rawImageUrls.length > 0) {
        targetZynerdPath = rawImageUrls[0];
      }
    } catch (e) {
      this.logger.error(`Error fetching raw details for photo: ${e.message}`);
    }

    if (targetZynerdPath) {
      try {
        const prefix = 'https://public.zynerd.com/';
        const pathStr = targetZynerdPath.startsWith(prefix)
          ? targetZynerdPath.substring(prefix.length)
          : targetZynerdPath;
        const resource = await this.proxyResource(pathStr);

        // Store in cache
        try {
          if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
          }
          fs.writeFileSync(cacheFilePath, Buffer.from(resource.data));
          fs.writeFileSync(
            cacheMetaPath,
            JSON.stringify({
              contentType: resource.contentType,
              timestamp: Date.now(),
            }),
          );
        } catch (e) {
          // ignore cache write error
        }

        return resource;
      } catch (e) {
        // proxy attempt failed, fallback below
      }
    }

    // 3. Fallback to local image in data/images/<instituteId>/
    const instDir = path.join(
      process.cwd(),
      'data',
      'images',
      instituteId.toString(),
    );
    if (fs.existsSync(instDir)) {
      const files = fs.readdirSync(instDir);
      const cover =
        files.find((f) => f.startsWith('cover_')) ||
        files.find((f) => f.startsWith('logo_')) ||
        files[0];
      if (cover) {
        const data = fs.readFileSync(path.join(instDir, cover));
        const ext = path.extname(cover).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
        return { data, contentType };
      }
    }

    throw new HttpException('Photo not found', HttpStatus.NOT_FOUND);
  }

  /**
   * Replace Zynerd URLs with direct static image URLs if downloaded locally,
   * or clean server asset proxy URLs for detail images.
   */
  private maskUrls(data: any): any {
    if (data === null || data === undefined) return data;

    try {
      const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
      const zynerdPublicPrefix = 'https://public.zynerd.com/';

      const resolveZynerdUrl = (zynerdUrl: string): string => {
        if (!zynerdUrl.startsWith(zynerdPublicPrefix)) return zynerdUrl;

        const relPath = zynerdUrl.substring(zynerdPublicPrefix.length);
        const rawParts = relPath.split('/');

        if (rawParts.length >= 3 && rawParts[0] === 'institutes') {
          const instituteId = rawParts[1];
          const category = rawParts[2]; // 'logo', 'cover', 'banner', 'photos', etc.
          const rawFilename = rawParts.slice(3).join('/');
          const decodedFilename = decodeURIComponent(rawFilename);

          const instDir = path.join(
            process.cwd(),
            'data',
            'images',
            instituteId,
          );
          if (fs.existsSync(instDir)) {
            const files = fs.readdirSync(instDir);

            let matchedFile: string | undefined;

            // 1. Check for downloaded logo or cover on disk
            if (category === 'logo') {
              matchedFile = files.find(
                (f) =>
                  f === `logo_${instituteId}.png` ||
                  f === `logo_${instituteId}.jpg` ||
                  f === `logo_${instituteId}.jpeg` ||
                  f === `logo_${instituteId}.webp`,
              );
            } else if (category === 'cover' || category === 'banner') {
              matchedFile = files.find(
                (f) =>
                  f === `cover_${instituteId}.jpg` ||
                  f === `cover_${instituteId}.png` ||
                  f === `cover_${instituteId}.jpeg` ||
                  f === `cover_${instituteId}.webp`,
              );
            }

            // 2. Exact match for specific file downloaded on disk
            if (!matchedFile) {
              const encodedFilename = encodeURIComponent(decodedFilename);
              const findFile = (target: string) =>
                files.find(
                  (f) =>
                    f === target || f.toLowerCase() === target.toLowerCase(),
                );
              matchedFile =
                findFile(rawFilename) ||
                findFile(decodedFilename) ||
                findFile(encodedFilename);
            }

            if (matchedFile) {
              const finalFileName = matchedFile.includes('%')
                ? matchedFile
                : encodeURIComponent(matchedFile);
              return `${appUrl}/data/images/${instituteId}/${finalFileName}`;
            }
          }

          // Detail photos -> Format clean URL like /institutes/1516/photos/photo-11.jpg
          const matchPhotoNum =
            decodedFilename.match(/photo\s*(\d+)/i) ||
            decodedFilename.match(/(\d+)/);
          const extMatch = decodedFilename.match(/\.(jpg|jpeg|png|webp|avif)/i);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

          if (matchPhotoNum) {
            const num = matchPhotoNum[1];
            return `${appUrl}/institutes/${instituteId}/photos/photo-${num}.${ext}`;
          }

          const slug = decodedFilename
            .replace(/[^a-zA-Z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase();
          return `${appUrl}/institutes/${instituteId}/photos/${slug}`;
        }

        return `${appUrl}/data/${encodeURI(relPath)}`;
      };

      const transform = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') {
          return resolveZynerdUrl(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map((item) => transform(item));
        }
        if (typeof obj === 'object') {
          const res: any = {};
          for (const [k, v] of Object.entries(obj)) {
            res[k] = transform(v);
          }
          return res;
        }
        return obj;
      };

      return transform(data);
    } catch (error) {
      this.logger.error(`Error masking URLs: ${error.message}`);
      return data;
    }
  }

  /**
   * Handle HTTP errors from external API
   */
  private handleHttpError(error: any, message: string): never {
    if (error.response) {
      // External API returned an error response
      throw new HttpException(
        {
          statusCode: error.response.status,
          message: message,
          externalError: error.response.data,
        },
        error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'External service unavailable',
          error: 'No response from external API',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      // Error in request setup
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: message,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
