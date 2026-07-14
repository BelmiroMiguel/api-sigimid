import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuditFields } from '../../../core/database/audit-fields.abstract';
import { Deficiencia } from './deficiencia.entity';

@Entity({ name: 'tb_grau_deficiencia' })
@Index('idx_grau_deficiencia_descricao', ['descricao', 'dataEliminacao'], {
  unique: true,
})
export class GrauDeficiencia extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idGrauDeficiencia' })
  idGrauDeficiencia: string;

  @Column({
    name: 'idDeficiencia',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idDeficiencia: string;

  @ManyToOne(() => Deficiencia, (gd) => gd.graus, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'idDeficiencia' })
  deficiencia: Deficiencia;

  @Column({ name: 'descricao', type: 'varchar', length: 100, nullable: false })
  descricao: string;
}
