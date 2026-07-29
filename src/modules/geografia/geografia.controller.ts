import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GeografiaService } from './geografia.service';
import { CreateGeografiaDto } from './dto/create-geografia.dto';
import { UpdateGeografiaDto } from './dto/update-geografia.dto';
import { RolesPapelUtilizador } from '../../core/decorators/roles-papel-utilizador.decorator';
import { IApiResponse } from '../../core/interfaces/api-response.interface';
import { PapelUtilizador } from '../utilizador/enums/utilizador.enum';

@Controller('geografia')
export class GeografiaController {
  constructor(private readonly service: GeografiaService) {}

  @Get('estatistica')
  @RolesPapelUtilizador(
    PapelUtilizador.ADMINISTRADOR,
    PapelUtilizador.SUPERVISOR,
    PapelUtilizador.CADASTRADOR,
  )
  @HttpCode(HttpStatus.OK)
  async obterEstatisticas(): Promise<
    IApiResponse<{ provincias: number; municipios: number; bairros: number }>
  > {
    const data = await this.service.obterEstatisticas();
    return {
      message: 'estatistica carregada.',
      body: data,
    };
  }
}
