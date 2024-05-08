import { Request, Response } from "express";
import { Redis } from "ioredis";
import { createUserLoader } from "./utils/createUserLoader";
import { createLikeStatusLoader } from "./utils/createLikeStatusLoader";

export type MyContext = {
  req: Request;
  res: Response;
  redis: Redis;
  userLoader: ReturnType<typeof createUserLoader>;
  likeStatusLoader: ReturnType<typeof createLikeStatusLoader>;
};
