import { Test, TestingModule } from '@nestjs/testing';
import { PaiementsController } from './paiements.controller';

describe('PaiementsController', () => {
  let controller: PaiementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaiementsController],
    }).compile();

    controller = module.get<PaiementsController>(PaiementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
