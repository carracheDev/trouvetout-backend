import { Test, TestingModule } from '@nestjs/testing';
import { AnalytiquesController } from './analytiques.controller';

describe('AnalytiquesController', () => {
  let controller: AnalytiquesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalytiquesController],
    }).compile();

    controller = module.get<AnalytiquesController>(AnalytiquesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
