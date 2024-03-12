import { DataSource } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

export const AppDataSource = new DataSource({
  type: "postgres",
  username: "postgres",
  password: "postgres",
  database: "ecommunity-db",
  entities: [Post, User],
  logging: true,
  synchronize: true,
});
