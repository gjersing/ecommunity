import { __prod__ } from "./constants";

export default {
    entities: ['./dist/entities'],
    dbName: 'ecommunity',
    debug: !__prod__,
};