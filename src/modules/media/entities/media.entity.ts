import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { TipoMedia } from '../enums/media.enum';
import { AuditFields } from '../../../core/database/audit-fields.abstract';

@Entity({ name: 'tb_media' })
@Index('idx_media_registo', ['tabelaAfetada', 'idRegisto'])
export class Media extends AuditFields {
  @PrimaryGeneratedColumn('uuid', { name: 'idMedia' })
  idMedia: string;

  @Column({
    name: 'idOrganizacao',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  idOrganizacao: string;

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
    name: 'caminhoFicheiro',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  caminhoFicheiro: string;

  @Column({
    name: 'tipoMedia',
    type: 'enum',
    enum: TipoMedia,
    nullable: false,
  })
  tipoMedia: TipoMedia;

  @Column({
    name: 'nomeOriginal',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  nomeOriginal: string;

  @Column({ name: 'mimeType', type: 'varchar', length: 100, nullable: false })
  mimeType: string;
}
