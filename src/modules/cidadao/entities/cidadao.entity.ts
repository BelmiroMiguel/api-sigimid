import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  AfterLoad,
} from 'typeorm';
import { Organizacao } from '../../organizacao/entities/organizacao.entity';
import { Bairro } from '../../geografia/entities/bairro.entity';
import { Utilizador } from '../../utilizador/entities/utilizador.entity';
import { TipoIdentificacaoCidadao, EstadoCidadao } from '../enums/cidadao.enum';
import { AuditFields } from '../../../core/database/audit-fields.abstract';
import { CidadaoDeficiencia } from './cidadao-deficiencia.entity';

@Entity({ name: 'tb_cidadao' })
@Index(
  'idx_cidadao_identificacao_global',
  ['identificacao', 'tipoIdentificacao', 'dataEliminacao'],
  { unique: true },
)
export class Cidadao extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idCidadao' })
  idCidadao: string;

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

  @Column({
    name: 'identificacao',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  identificacao: string;

  @Column({
    name: 'tipoIdentificacao',
    type: 'enum',
    enum: TipoIdentificacaoCidadao,
    nullable: false,
  })
  tipoIdentificacao: TipoIdentificacaoCidadao;

  @Column({ name: 'dataNascimento', type: 'date', nullable: false })
  dataNascimento: Date;

  @Column({ name: 'telefone', type: 'varchar', length: 20, nullable: true })
  telefone: string | null;

  @Column({ name: 'idBairro', type: 'varchar', length: 36, nullable: false })
  idBairro: string;

  @ManyToOne(() => Bairro, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idBairro' })
  bairro: Bairro;

  @Column({ name: 'descricaoEndereco', type: 'text', nullable: false })
  descricaoEndereco: string;

  @Column({ name: 'dataInscricao', type: 'date', nullable: false })
  dataInscricao: Date;

  @Column({ name: 'observacoes', type: 'text', nullable: true })
  observacoes: string | null;

  @Column({
    name: 'idUtilizadorCriador',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idUtilizadorCriador: string;

  @ManyToOne(() => Utilizador, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idUtilizadorCriador' })
  utilizadorCriador: Utilizador;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoCidadao,
    default: EstadoCidadao.ATIVO,
    nullable: false,
  })
  estado: EstadoCidadao;

  @Column({ name: 'motivoEliminacao', type: 'text', nullable: true })
  motivoEliminacao: string | null;

  @OneToMany(() => CidadaoDeficiencia, (cd) => cd.cidadao)
  cidadaoDeficiencias: CidadaoDeficiencia[];

  @Column({ name: 'fotoPerfil', type: 'varchar', length: 255, nullable: true })
  fotoPerfil?: string;

  @Column({ name: 'fotosCorpoCompleto', type: 'simple-json', nullable: true })
  fotosCorpoCompleto?: string[];

  // === PROPRIEDADES VIRTUAIS BASE (Guarda o caminho relativo limpo da base de dados) ===
  fotoPerfilBase?: string;
  fotosCorpoCompletoBase?: string[];

  @AfterLoad()
  private afterLoad() {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // Formatação da Foto de Perfil
    this.fotoPerfilBase = this.fotoPerfil;
    if (this.fotoPerfil) {
      this.fotoPerfil = `${baseUrl}/img/${this.fotoPerfil}`;
    }

    // Formatação da Galeria JSON de Corpo Completo
    this.fotosCorpoCompletoBase = this.fotosCorpoCompleto;
    if (this.fotosCorpoCompleto && Array.isArray(this.fotosCorpoCompleto)) {
      this.fotosCorpoCompleto = this.fotosCorpoCompleto.map(
        (caminho) => `${baseUrl}/img/${caminho}`,
      );
    }
  }
}
