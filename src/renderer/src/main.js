import { mount } from "svelte";


// import "./assets/m.css";
import "./assets/main.css";
import "svelte-material-ui/bare.css";

import App from "./App.svelte";

const app = mount(App, {
  target: document.getElementById("app"),
});

export default app;
