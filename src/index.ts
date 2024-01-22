import "reflect-metadata";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { __port__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();
  const fork = orm.em.fork();

  const app = express();

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: () => ({ em: fork }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  app.listen(__port__, () => {
    console.log(`Server started successfully on localhost:${__port__}`);
  });
};

main().catch((err) => {
  console.error(err);
});
