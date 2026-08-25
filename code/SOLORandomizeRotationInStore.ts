//------------------------------------------------------------------------------
// SOLORandomizeRotationInStore
//
// Generates a random integer between 0 and 359 (inclusive) at the start of
// the screen, and writes it to a bound Store field. Useful for randomising
// a starting rotation value (e.g. for seeding SOLO-PointerRotateImage) or
// any other 0-359 range value, without needing to pre-generate it in the
// spreadsheet.
//------------------------------------------------------------------------------
import {
  registerSimple,
  registerEditor,
  component,
  TaskComponent,
  TaskComponentFactory,
  Binding,
} from "@gorilla/compiled/task-builder.js";
//------------------------------------------------------------------------------
export interface RandomizeRotationInStoreFactory extends TaskComponentFactory {
  destination: string;
}
//------------------------------------------------------------------------------
@component("task.component.RandomizeRotationInStore")
export class RandomizeRotationInStore extends TaskComponent<RandomizeRotationInStoreFactory> {
  private destBinding: Binding;

  public construct() {
    this.destBinding = this.createBinding();
    super.construct();
  }

  public apply(f: RandomizeRotationInStoreFactory) {
    super.apply(f);
    this.destBinding.parseIfExists(f.destination);
  }

  public screenStart() {
    super.screenStart();

    const rotation = Math.floor(Math.random() * 360); // 0–359

    // Write the random value out to the bound Store field
    this.destBinding.write(rotation);
    console.log("Start rotation: ", rotation);
  }
}
//------------------------------------------------------------------------------
registerEditor("RandomizeRotationInStore", {
  label: "SOLORandomizeRotationInStore",
  icon: "fas fa-rotate",
  form: {
    elements: [
      {
        class: "FormElementBindableField",
        label: "Destination",
        field: "destination",
      },
    ],
  },
});
//------------------------------------------------------------------------------
registerSimple("component", "RandomizeRotationInStore", {
  description: "Writes a random 0-359 value to a bound field",
});
