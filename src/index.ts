import { MikroORM } from '@mikro-orm/postgresql';
import { Post } from './entities/Post';
import mikroOrmConfig from './mikro-orm.config';

const main = async () => {
    const orm = await MikroORM.init(mikroOrmConfig);
    console.log(orm.em);

    const post = orm.em.create(Post, {title: 'my first post'});
    await orm.em.persistAndFlush(post);
    await orm.em.insert(Post, {title: 'my first post 2'});
};

main();
