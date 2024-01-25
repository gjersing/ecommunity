import session from "express-session";
import { User } from "../../src/entities/User";

declare module "express-session" {
  export interface SessionData {
    user: User;
    userId: number;
  }
}
