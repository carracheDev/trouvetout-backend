import { Test, TestingModule } from '@nestjs/testing';
import { PanierController } from './panier.controller';

describe('PanierController', () => {
  let controller: PanierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PanierController],
    }).compile();

    controller = module.get<PanierController>(PanierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
