import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ redirect }) => {
  throw redirect(302, "/twitter/");
};

export default component$(() => {
  return <div />;
});
