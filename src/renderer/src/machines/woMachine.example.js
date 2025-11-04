/**
 * Example usage of woMachine
 *
 * This file demonstrates how to use the work order machine
 * in your React components or other parts of the application.
 */

import { createActor } from "xstate";
import { woMachine } from "./woMachine.js";

// Example 1: Basic usage - Load all work orders
function exampleLoadAll() {
  const actor = createActor(woMachine);
  actor.start();

  // Subscribe to state changes
  actor.subscribe((state) => {
    console.log("Current state:", state.value);
    console.log("Work orders:", state.context.workOrders);
    console.log("Total:", state.context.total);
    console.log("Error:", state.context.error);
  });

  // Load all work orders
  actor.send({ type: "LOAD" });
}

// Example 2: Load a specific work order by ID
function exampleLoadById(workOrderId) {
  const actor = createActor(woMachine);
  actor.start();

  actor.subscribe((state) => {
    console.log("Selected work order:", state.context.selectedWorkOrder);
  });

  // Load specific work order
  actor.send({ type: "LOAD_ONE", id: workOrderId });
}

// Example 3: Load with filters
function exampleLoadFiltered() {
  const actor = createActor(woMachine);
  actor.start();

  actor.subscribe((state) => {
    console.log("Filtered work orders:", state.context.workOrders);
  });

  // Load filtered work orders
  actor.send({
    type: "LOAD_FILTERED",
    filters: {
      status: "active",
      customer: "003"
      // Add any filters your API supports
    }
  });
}

// Example 4: Using in a React component with useActor
/*
import { useActor } from "@xstate/react";
import { woMachine } from "../machines/woMachine.js";

function WorkOrderList() {
  const [state, send] = useActor(woMachine);

  useEffect(() => {
    // Load work orders when component mounts
    send({ type: "LOAD" });
  }, []);

  if (state.matches("loading")) {
    return <div>Loading work orders...</div>;
  }

  if (state.matches("error")) {
    return (
      <div>
        <p>Error: {state.context.error}</p>
        <button onClick={() => send({ type: "RETRY" })}>Retry</button>
      </div>
    );
  }

  if (state.matches("ready")) {
    return (
      <div>
        <button onClick={() => send({ type: "REFRESH" })}>Refresh</button>
        <p>Total work orders: {state.context.total}</p>
        <ul>
          {state.context.workOrders.map((wo) => (
            <li key={wo.WO_Number}>{wo.WO_Number} - {wo.Patient_Name}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
*/

// Example 5: Refresh data
function exampleRefresh(actor) {
  // After data is loaded, you can refresh it
  actor.send({ type: "REFRESH" });
}

// Example 6: Reset and clear all data
function exampleReset(actor) {
  actor.send({ type: "RESET" });
}

// Example 7: Using with Tabulator
/*
import { TabulatorFull as Tabulator } from "tabulator-tables";

function createWorkOrderTable(actor) {
  const container = document.getElementById("work-order-table");

  let table = null;

  actor.subscribe((state) => {
    if (state.matches("ready")) {
      if (table) {
        // Update existing table
        table.setData(state.context.workOrders);
      } else {
        // Create new table
        table = new Tabulator(container, {
          data: state.context.workOrders,
          columns: state.context.columns,
          layout: "fitColumns",
          pagination: true,
          paginationSize: 50,
        });
      }
    }
  });

  // Load data
  actor.send({ type: "LOAD" });
}
*/

export {
  exampleLoadAll,
  exampleLoadById,
  exampleLoadFiltered,
  exampleRefresh,
  exampleReset,
};
