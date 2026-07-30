import {
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class AuditFields {
  @CreateDateColumn({ name: 'dataCriacao', type: 'timestamp' })
  dataCriacao: Date;

  @UpdateDateColumn({ name: 'dataAtualizacao', type: 'timestamp' })
  dataAtualizacao: Date;

  @Column({
    name: 'dataEliminacao',
    type: 'timestamp',
    nullable: true,
    select: false,
  })
  dataEliminacao?: Date;

  @Column({
    name: 'idUltimaModificacao',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  idUltimaModificacao?: string;
}
