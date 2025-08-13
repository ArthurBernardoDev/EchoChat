import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: 'healthy' | 'unhealthy'
    redis: 'healthy' | 'unhealthy'
  }
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private prismaService: PrismaService,
    private redisService: RedisService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    const startTime = Date.now()
    
    let databaseHealth: 'healthy' | 'unhealthy' = 'unhealthy'
    try {
      await this.prismaService.$queryRaw`SELECT 1`
      databaseHealth = 'healthy'
    } catch (error) {
      console.error('Database health check failed:', error)
    }

    const redisHealth = await this.redisService.isHealthy() ? 'healthy' : 'unhealthy'

    const memUsage = process.memoryUsage()
    const memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (databaseHealth === 'unhealthy' || redisHealth === 'unhealthy') {
      status = 'unhealthy'
    } else if (memory.percentage > 85) {
      status = 'degraded'
    }

    const healthCheck: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        redis: redisHealth,
      },
      uptime: Math.floor(process.uptime()),
      memory,
    }

    return healthCheck
  }

  @Get('detailed')
  async getDetailedHealth() {
    const basic = await this.getHealth()
    
    const connectedUsers = await this.redisService.getAllConnectedUsers()
    
    return {
      ...basic,
      metrics: {
        connectedUsers: connectedUsers.length,
        responseTime: Date.now() - Date.now(), 
      },
    }
  }
}
