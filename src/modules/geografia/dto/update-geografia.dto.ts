import { PartialType } from '@nestjs/mapped-types';
import { CreateGeografiaDto } from './create-geografia.dto';

export class UpdateGeografiaDto extends PartialType(CreateGeografiaDto) {}
