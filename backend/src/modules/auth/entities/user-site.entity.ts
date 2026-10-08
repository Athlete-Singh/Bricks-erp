import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_sites')
export class UserSite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;
}
