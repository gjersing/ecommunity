import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from "obscenity";
import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

const regexp = new RegExp(
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
);

const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!regexp.test(options.email)) {
    return [
      {
        field: "email",
        message: "Email is in an invalid format",
      },
    ];
  }

  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "Contains an invalid character '@'",
      },
    ];
  }
  if (options.username.length < 2 || options.username.length > 40) {
    return [
      {
        field: "username",
        message: "Length must be greater than 2 and less than 40.",
      },
    ];
  }
  if (profanityMatcher.hasMatch(options.username)) {
    return [
      {
        field: "username",
        message:
          "Username contains inappropriate language that cannot be submitted.",
      },
    ];
  }
  if (options.password.length < 3) {
    return [
      {
        field: "password",
        message: "Length must be greater than 3.",
      },
    ];
  }

  return null;
};
