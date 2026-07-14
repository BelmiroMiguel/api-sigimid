import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoGeografia } from '../enums/geografia.enum';
import { Municipio } from './municipio.entity';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_bairro' })
export class Bairro extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idBairro' })
  idBairro: string;

  @Column({ name: 'idMunicipio', type: 'varchar', length: 36, nullable: false })
  idMunicipio: string;

  @ManyToOne(() => Municipio, (municipio) => municipio.bairros, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idMunicipio' })
  municipio: Municipio;

  @Column({ name: 'descricao', type: 'varchar', length: 100, nullable: false })
  descricao: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoGeografia,
    default: EstadoGeografia.ATIVO,
    nullable: false,
  })
  estado: EstadoGeografia;
}
