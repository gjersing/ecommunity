import { Entity, Opt, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType() // Identifies class to GraphQL
@Entity()
export class Post {
  @Field(() => Int) // Optional: Exposes property to GraphQL
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property()
  createdAt: Date & Opt = new Date();

  @Field(() => String)
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();

  @Field()
  @Property({ type: "text" })
  title: string;
}