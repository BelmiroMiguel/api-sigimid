import { PartialType } from '@nestjs/mapped-types';
import { CreateDeficienciaDto } from './create-deficiencia.dto';

export class UpdateDeficienciaDto extends PartialType(CreateDeficienciaDto) {}
