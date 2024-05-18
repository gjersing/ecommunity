import { FieldError, MyContext } from "../types";
import { Post } from "../entities/Post";
import { Like } from "../entities/Like";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { isAuth } from "../middleware/isAuth";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

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

@ObjectType()
class PostResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Post, { nullable: true })
  post?: Post;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => User)
  author(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.authorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async likeStatus(
    @Root() post: Post,
    @Ctx() { likeStatusLoader, req }: MyContext,
  ) {
    if (!req.session.userId) {
      return null;
    }

    const like = await likeStatusLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });

    return like ? 1 : null;
  }

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
  ): Promise<PaginatedPosts> {
    const trueLimit = Math.min(20, limit);
    const trueLimitPlusOne = trueLimit + 1;

    const replacements: any[] = [trueLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await AppDataSource.query(
      `
    select p.*
    from post p
    ${cursor ? `where p."createdAt" < $2` : ""}
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
    return Post.findOne({ where: { id } });
  }

  @Mutation(() => PostResponse)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext,
  ): Promise<PostResponse> {
    const profanityMatcher = new RegExpMatcher({
      ...englishDataset.build(),
      ...englishRecommendedTransformers,
    });
    if (input.body) {
      if (profanityMatcher.hasMatch(input.body)) {
        return {
          errors: [
            {
              field: "body",
              message:
                "Caption contains inappropriate language that cannot be submitted.",
            },
          ],
        };
      } else if (input.body.length > 280) {
        return {
          errors: [
            {
              field: "body",
              message:
                "Caption is too long. The maximum length is 280 characters.",
            },
          ],
        };
      }
    }

    const post = await Post.create({
      ...input,
      authorId: req.session.userId,
    }).save();
    return { post };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext,
  ): Promise<boolean> {
    if (req.session.userId == 1) {
      await Post.delete({ id });
    } else {
      await Post.delete({ id, authorId: req.session.userId });
    }
    return true;
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("body", () => String, { nullable: true }) body: string,
    @Ctx() { req }: MyContext,
  ): Promise<Post | null> {
    let result = null;
    if (req.session.userId === 1) {
      result = await AppDataSource.createQueryBuilder()
        .update(Post)
        .set({ body })
        .where("id = :id", {
          id,
        })
        .returning("*")
        .execute();
    } else {
      result = await AppDataSource.createQueryBuilder()
        .update(Post)
        .set({ body })
        .where('id = :id and "authorId" = :authorId', {
          id,
          authorId: req.session.userId,
        })
        .returning("*")
        .execute();
    }

    return result.raw[0];
  }
}
