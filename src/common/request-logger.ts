import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    logger.log(`${method} ${originalUrl} -> ${status} (${ms}ms)`);
  });

  next();
}
