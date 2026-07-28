import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { EstadoCondicaoEspecial } from '../enums/deficiencia.enum';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_condicao_especial' })
@Index('idx_condicao_especial_descricao', ['descricao', 'dataEliminacao'], {
  unique: true,
})
export class CondicaoEspecial extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idCondicaoEspecial' })
  idCondicaoEspecial: string;

  @Column({ name: 'descricao', type: 'varchar', length: 100, nullable: false })
  descricao: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoCondicaoEspecial,
    default: EstadoCondicaoEspecial.ATIVO,
    nullable: false,
  })
  estado: EstadoCondicaoEspecial;
}
