import DataLoader from "dataloader";
import { Like } from "../entities/Like";

export const createLikeStatusLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Like | null>(
    async (keys) => {
      const likes = await Like.findBy(keys as any);

      const likeIdsToLike: Record<string, Like> = {};
      likes.forEach((like) => {
        likeIdsToLike[`${like.userId}|${like.postId}`] = like;
      });

      const returnVal = keys.map(
        (key) => likeIdsToLike[`${key.userId}|${key.postId}`],
      );

      return returnVal;
    },
  );
