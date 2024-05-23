import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Like } from "./Like";
import { Comment } from "./Comment";

@ObjectType() // Identifies class to GraphQL
@Entity()
export class Post extends BaseEntity {
  @Field(() => Int) // Optional: Exposes property to GraphQL
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => Int, { nullable: true })
  likeStatus: number | null;

  @Field()
  @Column()
  authorId: number;

  @Field(() => User)
  @ManyToOne(() => User, (author) => author.posts)
  author: User;

  @Field()
  @Column()
  body!: string;

  @Field()
  @Column()
  img!: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  @Field(() => [Comment], { nullable: true })
  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
