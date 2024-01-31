import "reflect-metadata";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { __port__, __prod__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import * as redis from "redis";
import RedisStore from "connect-redis";
import session from "express-session";
import cors from "cors";

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();
  const fork = orm.em.fork();

  const app = express();

  const redisClient = redis.createClient();
  redisClient.connect().catch(console.error);

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "myapp:",
    disableTouch: true,
  });

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    }),
  );

  app.use(
    session({
      name: "qid",
      store: redisStore,
      cookie: {
        maxAge: 31536000000, // 1 year
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
      },
      secret: "NONENVTESTSTRING",
      resave: false,
      saveUninitialized: false,
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ em: fork, req, res }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(__port__, () => {
    console.log(`Server started successfully on localhost:${__port__}`);
  });
};

main().catch((err) => {
  console.error(err);
});
