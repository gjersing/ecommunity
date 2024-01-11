import { MikroORM } from '@mikro-orm/postgresql';
// import { Post } from './entities/Post';
import mikroOrmConfig from './mikro-orm.config';
import express from 'express';
import { __port__ } from './constants';

const main = async () => {
  // Initialize MikroORM and migrate
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();

  const app = express();

  app.get('/', (_, res) => {
    res.send("hello");
  });

  app.listen(__port__, () => {
    console.log(`Server started successfully on localhost:${__port__}`);
  });
  
  // Fork to use EM methods & test creating Posts
  // const fork = orm.em.fork();
  // const post = fork.create(Post, {title: 'my first post'});
  // await fork.persistAndFlush(post);

  // const posts = await fork.find(Post, {});
  // console.log(posts);
};

main().catch((err) => {
    console.error(err);
});
