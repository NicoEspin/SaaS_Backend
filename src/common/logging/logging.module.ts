import { randomUUID } from 'crypto';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          redact: {
            paths: ['req.headers.authorization'],
            remove: true,
          },
          genReqId: (req) => {
            const header = req.headers['x-request-id'];
            if (typeof header === 'string' && header.length > 0) return header;
            if (Array.isArray(header) && header.length > 0) return header[0];
            return randomUUID();
          },
        },
      }),
    }),
  ],
})
export class LoggingModule {}
