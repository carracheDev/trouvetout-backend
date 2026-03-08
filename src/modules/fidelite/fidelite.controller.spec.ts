import { Test, TestingModule } from '@nestjs/testing';
import { FideliteController } from './fidelite.controller';

describe('FideliteController', () => {
  let controller: FideliteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FideliteController],
    }).compile();

    controller = module.get<FideliteController>(FideliteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
