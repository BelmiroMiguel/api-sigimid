import { Test, TestingModule } from '@nestjs/testing';
import { UtilizadorController } from './utilizador.controller';
import { UtilizadorService } from './utilizador.service';

describe('UtilizadorController', () => {
  let controller: UtilizadorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UtilizadorController],
      providers: [UtilizadorService],
    }).compile();

    controller = module.get<UtilizadorController>(UtilizadorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
