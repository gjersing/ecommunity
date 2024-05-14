import { DataSource } from "typeorm";
import "dotenv-safe/config";
import path from "path";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, "./entities/*")],
  migrations: [path.join(__dirname, "./migrations/*")],
  logging: true,
  // synchronize: true,
});
