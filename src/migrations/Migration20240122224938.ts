import { Migration } from '@mikro-orm/migrations';

export class Migration20240122224938 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "user" ("id" serial primary key, "created_at" timestamptz not null, "updated_at" timestamptz not null, "username" text not null, "password" text not null);');
    this.addSql('alter table "user" add constraint "user_username_unique" unique ("username");');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "user" cascade;');
  }

}
