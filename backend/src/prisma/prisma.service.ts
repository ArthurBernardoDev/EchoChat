import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: configService.get('NODE_ENV') === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    
    this.$use(async (params, next) => {
      if (params.model === 'Message') {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.args.where = { ...params.args.where, deleted: false };
        }
        if (params.action === 'findMany') {
          if (params.args.where) {
            if (params.args.where.deleted === undefined) {
              params.args.where = { ...params.args.where, deleted: false };
            }
          } else {
            params.args.where = { deleted: false };
          }
        }
      }
      
      return next(params);
    });

    console.log('✅ Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('❌ Prisma disconnected from database');
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && key[0] !== '$' && typeof key === 'string',
    );

    return Promise.all(
      models.map((modelKey) => {
        return this[modelKey].deleteMany();
      }),
    );
  }
}