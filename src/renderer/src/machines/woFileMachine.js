import { createMachine, assign, fromPromise, createActor } from "xstate";


export const woReportMachine = setup({
    actions:{},
    actors:{}
}).createMachine({
  id: "woReport",
  initial: "idle",
  context: {
    fileName: null,
    sheetName: null,
    sheetNames: [],
    errors: [],
    data: [],
    columns: []
  },
  states:{

  }
});

export const woReportActor = createActor(woReportMachine)