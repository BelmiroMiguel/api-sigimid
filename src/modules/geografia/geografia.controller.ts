import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GeografiaService } from './geografia.service';
import { CreateGeografiaDto } from './dto/create-geografia.dto';
import { UpdateGeografiaDto } from './dto/update-geografia.dto';

@Controller('geografia')
export class GeografiaController {
  constructor(private readonly geografiaService: GeografiaService) {}


}