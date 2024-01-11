import { Migrator } from "@mikro-orm/migrations";
import { __prod__ } from "./constants";
import { PostgreSqlDriver, defineConfig } from "@mikro-orm/postgresql";
import path from 'path';

export default defineConfig({
    migrations: {
        path: path.join(__dirname, "./migrations"), // absolute path to migrations
        glob: '!(*.d).{js,ts}', // how to match migration files (all .js and .ts files, but not .d.ts)
    },
    entities: ['./dist/entities'],
    extensions: [Migrator],
    dbName: 'ecommunity',
    driver: PostgreSqlDriver,
    debug: !__prod__,
});
