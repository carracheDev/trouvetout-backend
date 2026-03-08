import { Test, TestingModule } from '@nestjs/testing';
import { PaiementsService } from './paiements.service';

describe('PaiementsService', () => {
  let service: PaiementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaiementsService],
    }).compile();

    service = module.get<PaiementsService>(PaiementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
