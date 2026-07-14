import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  AfterLoad,
} from 'typeorm';
import { Organizacao } from '../../organizacao/entities/organizacao.entity';
import { PapelUtilizador, EstadoUtilizador } from '../enums/utilizador.enum';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_utilizador' })
@Index('idx_utilizador_email', ['email', 'dataEliminacao'], { unique: true })
export class Utilizador extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idUtilizador' })
  idUtilizador: string;

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
    name: 'nomeCompleto',
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  nomeCompleto: string;

  @Column({ name: 'email', type: 'varchar', length: 100, nullable: false })
  email: string;

  @Column({ name: 'senhaHash', type: 'varchar', length: 255, nullable: false })
  senhaHash: string;

  @Column({
    name: 'papel',
    type: 'enum',
    enum: PapelUtilizador,
    default: PapelUtilizador.CONSULTA,
    nullable: false,
  })
  papel: PapelUtilizador;

  @Column({ name: 'fotoPerfil', type: 'varchar', length: 255, nullable: true })
  fotoPerfil?: string;

  fotoPerfilBase?: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoUtilizador,
    default: EstadoUtilizador.ATIVO,
    nullable: false,
  })
  estado: EstadoUtilizador;

  @AfterLoad()
  private afterLoad() {
    this.fotoPerfilBase = this.fotoPerfil;
    this.fotoPerfil = `${process.env.BASE_URL}/img/${this.fotoPerfil}`;
  }
}
