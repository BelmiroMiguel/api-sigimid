import { Test, TestingModule } from '@nestjs/testing';
import { OrganizacaoService } from './organizacao.service';

describe('OrganizacaoService', () => {
  let service: OrganizacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizacaoService],
    }).compile();

    service = module.get<OrganizacaoService>(OrganizacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
