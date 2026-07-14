import { PartialType } from '@nestjs/mapped-types';
import { CreateUtilizadorDto } from './create-utilizador.dto';

export class UpdateUtilizadorDto extends PartialType(CreateUtilizadorDto) {}
