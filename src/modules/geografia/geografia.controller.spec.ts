import { Test, TestingModule } from '@nestjs/testing';
import { GeografiaController } from './geografia.controller';
import { GeografiaService } from './geografia.service';

describe('GeografiaController', () => {
  let controller: GeografiaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeografiaController],
      providers: [GeografiaService],
    }).compile();

    controller = module.get<GeografiaController>(GeografiaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
