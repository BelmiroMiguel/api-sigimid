import { Test, TestingModule } from '@nestjs/testing';
import { CidadaoController } from './cidadao.controller';
import { CidadaoService } from './cidadao.service';

describe('CidadaoController', () => {
  let controller: CidadaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CidadaoController],
      providers: [CidadaoService],
    }).compile();

    controller = module.get<CidadaoController>(CidadaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
