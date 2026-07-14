import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EstadoGeografia } from '../enums/geografia.enum';
import { Provincia } from './provincia.entity';
import { Bairro } from './bairro.entity';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_municipio' })
export class Municipio extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idMunicipio' })
  idMunicipio: string;

  @Column({ name: 'idProvincia', type: 'varchar', length: 36, nullable: false })
  idProvincia: string;

  @ManyToOne(() => Provincia, (provincia) => provincia.municipios, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idProvincia' })
  provincia: Provincia;

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

  @OneToMany(() => Bairro, (bairro) => bairro.municipio)
  bairros: Bairro[];
}
