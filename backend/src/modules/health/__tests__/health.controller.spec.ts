import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

async function buildController(query: jest.Mock): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [HealthService, { provide: getDataSourceToken(), useValue: { query } }],
  }).compile();
  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const controller = await buildController(jest.fn().mockResolvedValue([{ '?column?': 1 }]));
    const result = await controller.get();
    expect(result).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('returns 503 when the database is down', async () => {
    const controller = await buildController(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(controller.get()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
