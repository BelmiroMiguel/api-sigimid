import { Test, TestingModule } from '@nestjs/testing';
import { CidadaoService } from './cidadao.service';

describe('CidadaoService', () => {
  let service: CidadaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CidadaoService],
    }).compile();

    service = module.get<CidadaoService>(CidadaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
