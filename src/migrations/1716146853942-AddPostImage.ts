import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostImage1716146853942 implements MigrationInterface {
    name = 'AddPostImage1716146853942'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post" ADD "img" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "img"`);
    }

}
