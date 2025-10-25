import { createRouter } from "sv-router";
import BatchJob from "../pages/BatchJob.svelte";
import WorkOrders from "../pages/WorkOrders.svelte";
import QueueFiles from "../pages/QueueFiles.svelte";

export const { p, navigate, isActive, route } = createRouter({
  "/": BatchJob,
  "/workorders": WorkOrders,
  "/queuefiles": QueueFiles,
  "*": () => console.log("PAGE NOT FOUND IT"),
});
