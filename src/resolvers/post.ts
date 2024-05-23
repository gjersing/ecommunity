import { FieldError, MyContext } from "../types";
import { Storage } from "@google-cloud/storage";
import { Post } from "../entities/Post";
import { Like } from "../entities/Like";
import { Comment } from "../entities/Comment";
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
import path from "path";
import { FileUpload } from "graphql-upload";
import { GraphQLUpload } from "graphql-upload";

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

  @Field(() => Boolean, { nullable: true })
  post?: boolean;
}

const storage = new Storage({
  keyFilename: path.join(
    __dirname,
    "../../ecommunity-423817-d3ad91c2b7f7.json",
  ),
});
const bucketName = "eco-images";

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => User)
  author(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.authorId);
  }

  @FieldResolver(() => [Comment], { nullable: true })
  async comments(@Root() post: Post) {
    return Comment.findBy({ postId: post.id });
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

  @Mutation(() => PostResponse)
  @UseMiddleware(isAuth)
  async comment(
    @Arg("postId", () => Int) postId: number,
    @Arg("body", () => String) body: string,
    @Ctx() { req }: MyContext,
  ): Promise<PostResponse> {
    const { userId } = req.session;

    if (!body) {
      return {
        errors: [
          {
            field: "body",
            message: "Comment cannot be blank.",
          },
        ],
      };
    }

    if (profanityMatcher.hasMatch(body)) {
      return {
        errors: [
          {
            field: "body",
            message:
              "Comment contains inappropriate language that cannot be submitted.",
          },
        ],
      };
    } else if (body.length > 200) {
      return {
        errors: [
          {
            field: "body",
            message:
              "Comment is too long. The maximum length is 200 characters.",
          },
        ],
      };
    }
    const user = await User.findOne({ where: { id: userId } });

    await Comment.create({
      userId,
      postId,
      body,
      username: user?.username,
    }).save();

    return { post: true };
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteComment(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext,
  ): Promise<boolean> {
    if (req.session.userId == 1) {
      await Comment.delete({ id });
    } else {
      await Comment.delete({ id, userId: req.session.userId });
    }
    return true;
  }

  @Mutation(() => Comment, { nullable: true })
  @UseMiddleware(isAuth)
  async updateComment(
    @Arg("id", () => Int) id: number,
    @Arg("body", () => String) body: string,
    @Ctx() { req }: MyContext,
  ): Promise<Comment | null> {
    let result = null;
    if (req.session.userId === 1) {
      result = await AppDataSource.createQueryBuilder()
        .update(Comment)
        .set({ body })
        .where("id = :id", {
          id,
        })
        .returning("*")
        .execute();
    } else {
      result = await AppDataSource.createQueryBuilder()
        .update(Comment)
        .set({ body })
        .where('id = :id and "userId" = :userId', {
          id,
          userId: req.session.userId,
        })
        .returning("*")
        .execute();
    }

    return result.raw[0];
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
    @Arg("file", () => GraphQLUpload)
    { createReadStream, filename }: FileUpload,
    @Arg("input")
    input: PostInput,
    @Ctx() { req }: MyContext,
  ): Promise<PostResponse> {
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

    let imgUrl = "";
    await new Promise((resolve, reject) =>
      createReadStream()
        .pipe(
          storage
            .bucket(bucketName)
            .file(filename)
            .createWriteStream({ resumable: false, gzip: true }),
        )
        .on("error", () => {
          reject;
        })
        .on("finish", () =>
          storage
            .bucket(bucketName)
            .file(filename)
            .makePublic()
            .then(async (e: any) => {
              imgUrl = `https://storage.googleapis.com/eco-images/${e[0].object}`;
              const post = await Post.create({
                ...input,
                authorId: req.session.userId,
                img: imgUrl,
              }).save();
              resolve(post);
            }),
        ),
    );

    return { post: true };
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
