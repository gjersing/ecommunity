import { MyContext } from "src/types";
import { Post } from "../entities/Post";
import { Like } from "../entities/Like";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../data-source";

@InputType()
class PostInput {
  @Field()
  body?: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async like(
    @Arg("postId", () => Int) postId: number,
    @Ctx() { req }: MyContext,
  ) {
    const { userId } = req.session;
    const like = await Like.findOne({ where: { userId, postId } });

    // Remove like if exists, otherwise insert like
    if (like) {
      await AppDataSource.transaction(async (tm) => {
        await like.remove();
        await tm.query(
          `update post
        set points = points - 1
        where id = $1;`,
          [postId],
        );
      });
    } else {
      await AppDataSource.transaction(async (tm) => {
        await tm.query(
          `INSERT INTO "like" ("userId", "postId")
          VALUES ($1, $2);`,
          [userId, postId],
        );
        await tm.query(`update post
        set points = points + 1
        where id = ${postId};`);
      });
    }

    return true;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext,
  ): Promise<PaginatedPosts> {
    const trueLimit = Math.min(20, limit);
    const trueLimitPlusOne = trueLimit + 1;

    const { userId } = req.session;

    const replacements: any[] = [trueLimitPlusOne, userId];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await AppDataSource.query(
      `
    select p.*, 
    json_build_object('id', u.id, 'username', u.username, 'email', u.email) author
    ,
    (select "userId" from "like" where "userId" = $2 and "postId" = p.id) "likeStatus"
    from post p
    inner join public.user u on u.id = p."authorId"
    ${cursor ? `where p."createdAt" < $3` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements,
    );

    return {
      posts: posts.slice(0, trueLimit),
      hasMore: posts.length === trueLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id", () => Int) id: number): Promise<Post | null> {
    return Post.findOne({ where: { id }, relations: ["author"] });
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext,
  ): Promise<Post> {
    return Post.create({ ...input, authorId: req.session.userId }).save();
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext,
  ): Promise<boolean> {
    await Post.delete({ id, authorId: req.session.userId });
    return true;
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("body", () => String, { nullable: true }) body: string,
    @Ctx() { req }: MyContext,
  ): Promise<Post | null> {
    const result = await AppDataSource.createQueryBuilder()
      .update(Post)
      .set({ body })
      .where('id = :id and "authorId" = :authorId', {
        id,
        authorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }
}
