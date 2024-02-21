import "reflect-metadata";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import {
  LOCAL_ORIGIN,
  PROD_ORIGIN,
  SESSION_COOKIE_NAME,
  __port__,
  __prod__,
} from "./constants";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import session from "express-session";
import cors from "cors";

const main = async () => {
  const orm = await MikroORM.init(mikroOrmConfig);
  await orm.getMigrator().up();
  const fork = orm.em.fork();

  const app = express();

  const redis = new Redis();
  const redisStore = new RedisStore({
    client: redis,
    prefix: "myapp:",
    disableTouch: true,
  });

  app.use(
    cors({
      origin: __prod__ ? PROD_ORIGIN : LOCAL_ORIGIN,
      credentials: true,
    }),
  );

  app.use(
    session({
      name: SESSION_COOKIE_NAME,
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
    context: ({ req, res }) => ({ em: fork, req, res, redis }),
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
