import { createRouter } from "sv-router";
import WorkOrders from "../pages/WorkOrders.svelte";
import QueueFiles from "../pages/QueueFiles.svelte";
// import Preferences from "../pages/Preferences.svelte";

export const { p, navigate, isActive, route } = createRouter({
  "/": WorkOrders,
  "/queuefiles": QueueFiles,
  // "/preferences": Preferences,
  "*": () => console.log("PAGE NOT FOUND IT"),
});
