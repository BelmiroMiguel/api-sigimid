import { PartialType } from '@nestjs/mapped-types';
import { CreateCidadaoDto } from './create-cidadao.dto';

export class UpdateCidadaoDto extends PartialType(CreateCidadaoDto) {}
