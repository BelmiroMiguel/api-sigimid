import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { EstadoDeficiencia } from '../enums/deficiencia.enum';
import { AuditFields } from '../../../core/database/audit-fields.abstract';
import { GrauDeficiencia } from './grau-deficiencia.entity';

@Entity({ name: 'tb_deficiencia' })
@Index('idx_deficiencia_descricao', ['descricao', 'dataEliminacao'], {
  unique: true,
})
export class Deficiencia extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idDeficiencia' })
  idDeficiencia: string;

  @OneToMany(() => GrauDeficiencia, (gd) => gd.deficiencia, {
    eager: true,
    nullable: true,
  })
  graus: GrauDeficiencia[];

  @Column({ name: 'descricao', type: 'varchar', length: 100, nullable: false })
  descricao: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoDeficiencia,
    default: EstadoDeficiencia.ATIVO,
    nullable: false,
  })
  estado: EstadoDeficiencia;
}
