import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cidadao } from './cidadao.entity';
import { Organizacao } from '../../organizacao/entities/organizacao.entity';
import { CondicaoEspecial } from '../../deficiencia/entities/condicao-especial.entity';

@Entity({ name: 'tb_cidadao_condicao_especial' })
export class CidadaoCondicaoEspecial {
  @PrimaryGeneratedColumn('uuid', { name: 'idCidadaoCondicaoEspecial' })
  idCidadaoCondicaoEspecial: string;

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

  @ManyToOne(() => Cidadao, (c) => c.cidadaoCondicoesEspeciais, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'idCidadao' })
  cidadao: Cidadao;

  @Column({
    name: 'idCondicaoEspecial',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idCondicaoEspecial: string;

  @ManyToOne(() => CondicaoEspecial, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'idCondicaoEspecial' })
  condicaoEspecial: CondicaoEspecial;
}
