import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import {
  EstadoOrganizacao,
  TipoIdentificacaoOrganizacao,
} from '../enums/organizacao.enum';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_organizacao' })
@Index('idx_organizacao_nif', ['identificacao', 'dataEliminacao'], {
  unique: true,
})
export class Organizacao extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idOrganizacao' })
  idOrganizacao: string;

  @Column({ name: 'descricao', type: 'varchar', length: 150, nullable: false })
  descricao: string;

  @Column({
    name: 'identificacao',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  identificacao: string;

  @Column({
    name: 'tipoIdentificacao',
    type: 'enum',
    enum: TipoIdentificacaoOrganizacao,
    default: TipoIdentificacaoOrganizacao.NIF,
    nullable: false,
  })
  tipoIdentificacao: TipoIdentificacaoOrganizacao;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoOrganizacao,
    default: EstadoOrganizacao.ATIVO,
    nullable: false,
  })
  estado: EstadoOrganizacao;
}
