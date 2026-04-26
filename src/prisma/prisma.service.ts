import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();

    this.$use(async (params, next) => {
      const start = Date.now();

      const result = await next(params);

      const duration = Date.now() - start;

      console.log(
        `[Prisma] ${params.model}.${params.action} - ${duration}ms`,
      );

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}