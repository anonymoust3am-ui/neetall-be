import { Expose, Type } from 'class-transformer';

export class BodyEntity {
  @Expose()
  id: string;

  @Expose()
  key: string;

  @Expose()
  name: string;

  @Expose()
  quota: string;
}

export class CounsellingOptionEntity {
  @Expose()
  id: string;

  @Expose()
  value: string;

  @Expose()
  label: string;

  @Expose()
  @Type(() => BodyEntity)
  bodies: BodyEntity[];

  @Expose()
  desc?: string;

  @Expose()
  icon?: string;
}
