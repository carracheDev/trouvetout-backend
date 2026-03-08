import { Test, TestingModule } from '@nestjs/testing';
import { LivraisonsService } from './livraisons.service';

describe('LivraisonsService', () => {
  let service: LivraisonsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LivraisonsService],
    }).compile();

    service = module.get<LivraisonsService>(LivraisonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
