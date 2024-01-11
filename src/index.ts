import { MikroORM } from '@mikro-orm/postgresql';
import { Post } from './entities/Post';
import mikroOrmConfig from './mikro-orm.config';

const main = async () => {
    // Initialize MikroORM and migrate
    const orm = await MikroORM.init(mikroOrmConfig);
    await orm.getMigrator().up();
    
    // Fork to use EM methods & test creating Posts
    const fork = orm.em.fork();
    const post = fork.create(Post, {title: 'my first post'});
    await fork.persistAndFlush(post);
};

main().catch((err) => {
    console.error(err);
});
