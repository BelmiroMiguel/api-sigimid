import { Test, TestingModule } from '@nestjs/testing';
import { GeografiaService } from './geografia.service';

describe('GeografiaService', () => {
  let service: GeografiaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeografiaService],
    }).compile();

    service = module.get<GeografiaService>(GeografiaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
