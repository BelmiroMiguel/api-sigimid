import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cidadao } from './cidadao.entity';
import { Deficiencia } from '../../deficiencia/entities/deficiencia.entity';
import { Organizacao } from '../../organizacao/entities/organizacao.entity';
import { GrauDeficiencia } from '../../deficiencia/entities/grau-deficiencia.entity';

@Entity({ name: 'tb_cidadao_deficiencia' })
export class CidadaoDeficiencia {
  @PrimaryGeneratedColumn('uuid', { name: 'idCidadaoDeficiencia' })
  idCidadaoDeficiencia: string;

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

  @Column({ name: 'idCidadao', type: 'varchar', length: 36, nullable: false })
  idCidadao: string;

  @ManyToOne(() => Cidadao, (cidadao) => cidadao.cidadaoDeficiencias, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idCidadao' })
  cidadao: Cidadao;

  @Column({
    name: 'idGrauDeficiencia',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idGrauDeficiencia: string;

  @ManyToOne(() => GrauDeficiencia, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idGrauDeficiencia' })
  grauDeficiencia: GrauDeficiencia;
}
