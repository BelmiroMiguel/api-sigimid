import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { EstadoGeografia } from '../enums/geografia.enum';
import { Municipio } from './municipio.entity';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_provincia' })
export class Provincia extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idProvincia' })
  idProvincia: string;

  @Column({
    name: 'descricao',
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
  })
  descricao: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoGeografia,
    default: EstadoGeografia.ATIVO,
    nullable: false,
  })
  estado: EstadoGeografia;

  @OneToMany(() => Municipio, (municipio) => municipio.provincia)
  municipios: Municipio[];
}
