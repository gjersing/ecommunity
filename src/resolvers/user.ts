import { User } from "../entities/User";
import argon2 from "argon2";
import {
  RESET_PASSWORD_PREFIX,
  SESSION_COOKIE_NAME,
  __prod__,
} from "../constants";
import { FieldError, MyContext } from "../types";
import {
  Field,
  Query,
  Resolver,
  Arg,
  Mutation,
  Ctx,
  ObjectType,
  FieldResolver,
  Root,
} from "type-graphql";
import { UsernamePasswordInput } from "./UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/mailer";
import { AppDataSource } from "../data-source";

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    if (req.session.userId === user.id) {
      return user.email;
    }
    return "";
  }

  @Query(() => User, { nullable: true })
  current_user(@Ctx() { req }: MyContext) {
    if (!req.session.userId) {
      return null;
    }

    return User.findOne({ where: { id: req.session.userId } });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    let user;

    try {
      const result = await AppDataSource.createQueryBuilder()
        .insert()
        .into(User)
        .values([
          {
            email: options.email,
            username: options.username,
            password: hashedPassword,
          },
        ])
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (err) {
      if (err.code === "23505") {
        const field = err.detail.includes("email") ? "email" : "username";
        return {
          errors: [
            {
              field: field,
              message: `${field} is already in use`,
            },
          ],
        };
      }
    }

    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext,
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } },
    );

    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "that username or email does not exist",
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "the password provided is incorrect",
          },
        ],
      };
    }

    req.session.userId = user.id;
    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    res.clearCookie(SESSION_COOKIE_NAME);
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          resolve(false);
          return;
        }

        resolve(true);
      }),
    );
  }
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis, req }: MyContext,
  ): Promise<UserResponse> {
    if (newPassword.length < 3) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "Length must be greater than 3",
          },
        ],
      };
    }

    const userId = await redis.get(RESET_PASSWORD_PREFIX + token);

    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Token expired",
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne({ where: { id: userIdNum } });

    if (!user) {
      return {
        errors: [
          {
            field: "user",
            message: "User no longer exists",
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(newPassword);
    await User.update({ id: userIdNum }, { password: hashedPassword });

    req.session.userId = user.id;
    await redis.del(RESET_PASSWORD_PREFIX + token);

    return { user };
  }

  @Mutation(() => Boolean)
  async resetPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext,
  ) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return true;
    }

    const url = process.env.CORS_ORIGIN;
    const token = crypto.randomUUID();
    await redis.set(RESET_PASSWORD_PREFIX + token, user.id, "EX", 3600 * 72);

    await sendEmail(
      user.email,
      `<a href="${url}/reset-password/${token}">Reset ECOmmunity Password</a>`,
    );

    return true;
  }
}
