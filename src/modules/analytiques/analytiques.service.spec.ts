import { Test, TestingModule } from '@nestjs/testing';
import { AnalytiquesService } from './analytiques.service';

describe('AnalytiquesService', () => {
  let service: AnalytiquesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalytiquesService],
    }).compile();

    service = module.get<AnalytiquesService>(AnalytiquesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
