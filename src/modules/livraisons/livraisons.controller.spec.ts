import { Test, TestingModule } from '@nestjs/testing';
import { LivraisonsController } from './livraisons.controller';

describe('LivraisonsController', () => {
  let controller: LivraisonsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivraisonsController],
    }).compile();

    controller = module.get<LivraisonsController>(LivraisonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
