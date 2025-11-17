import { createRouter } from "sv-router";
import WorkOrders from "../pages/WorkOrders.svelte";
import QueueFiles from "../pages/QueueFiles.svelte";

export const { p, navigate, isActive, route } = createRouter({
  "/": WorkOrders,
  "/queuefiles": QueueFiles,
  "*": () => console.log("PAGE NOT FOUND IT"),
});
