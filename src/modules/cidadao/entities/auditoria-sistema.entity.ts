import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organizacao } from '../../organizacao/entities/organizacao.entity';
import { Utilizador } from '../../utilizador/entities/utilizador.entity';
import { AcaoAuditoria } from '../enums/cidadao.enum';

@Entity({ name: 'tb_auditoria_sistema' })
export class AuditoriaSistema {
  @PrimaryGeneratedColumn('uuid', { name: 'idAuditoriaSistema' })
  idAuditoriaSistema: string;

  @Column({
    name: 'idOrganizacao',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idOrganizacao: string;

  @ManyToOne(() => Organizacao, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idOrganizacao' })
  organizacao: Organizacao;

  @Column({
    name: 'tabelaAfetada',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  tabelaAfetada: string;

  @Column({ name: 'idRegisto', type: 'varchar', length: 36, nullable: false })
  idRegisto: string;

  @Column({
    name: 'acao',
    type: 'enum',
    enum: AcaoAuditoria,
    nullable: false,
  })
  acao: AcaoAuditoria;

  @Column({ name: 'valorAntigo', type: 'json', nullable: true })
  valorAntigo: Record<string, unknown> | null;

  @Column({ name: 'valorNovo', type: 'json', nullable: true })
  valorNovo: Record<string, unknown> | null;

  @Column({
    name: 'idUtilizador',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idUtilizador: string;

  @ManyToOne(() => Utilizador, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idUtilizador' })
  utilizador: Utilizador;

  @Column({ name: 'ip', type: 'varchar', length: 45, nullable: false })
  ip: string;

  @CreateDateColumn({ name: 'dataEvento', type: 'timestamp' })
  dataEvento: Date;
}
