import { Test, TestingModule } from '@nestjs/testing';
import { FideliteService } from './fidelite.service';

describe('FideliteService', () => {
  let service: FideliteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FideliteService],
    }).compile();

    service = module.get<FideliteService>(FideliteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
