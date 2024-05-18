import "reflect-metadata";
import "dotenv/config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { SESSION_COOKIE_NAME, __prod__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import RedisStore from "connect-redis";
import session from "express-session";
import cors from "cors";
import { AppDataSource } from "./data-source";
import { createUserLoader } from "./utils/createUserLoader";
import { createLikeStatusLoader } from "./utils/createLikeStatusLoader";

const main = async () => {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const app = express();

  const redis = new Redis(process.env.REDIS_URL);
  const redisStore = new RedisStore({
    client: redis,
    prefix: "myapp:",
    disableTouch: true,
  });

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
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
        domain: __prod__ ? ".ecommunity.us" : undefined,
      },
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      likeStatusLoader: createLikeStatusLoader(),
    }),
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(parseInt(process.env.PORT), () => {
    console.log(`Server started successfully on localhost:${process.env.PORT}`);
  });
};

main().catch((err) => {
  console.error(err);
});
