# syntax=docker/dockerfile:1

FROM node:21

WORKDIR /app
COPY . .

RUN yarn
RUN yarn build

ENV NODE_ENV production

EXPOSE 3000
CMD ["node", "dist/index.js"]
USER node