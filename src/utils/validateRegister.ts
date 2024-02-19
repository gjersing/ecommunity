import { UsernamePasswordInput } from "src/resolvers/UsernamePasswordInput";

const regexp = new RegExp(
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
);

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
  if (options.username.length < 2) {
    return [
      {
        field: "username",
        message: "Length must be greater than 2",
      },
    ];
  }
  if (options.password.length < 3) {
    return [
      {
        field: "password",
        message: "Length must be greater than 3",
      },
    ];
  }

  return null;
};
