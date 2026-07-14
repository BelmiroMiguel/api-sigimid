import { Test, TestingModule } from '@nestjs/testing';
import { OrganizacaoController } from './organizacao.controller';
import { OrganizacaoService } from './organizacao.service';

describe('OrganizacaoController', () => {
  let controller: OrganizacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizacaoController],
      providers: [OrganizacaoService],
    }).compile();

    controller = module.get<OrganizacaoController>(OrganizacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
