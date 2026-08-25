# Custom scripts for Gorilla

This folder contains custom code components for [Gorilla](https://gorilla.sc), written for use in the Task Builder 2. They add functionality that isn't available out of the box in the drag-and-drop editor.

Add the script to your task, then fill in its settings through the normal Gorilla inspector panel, the same way you would for any built-in component.

If you haven't added a custom script to a Gorilla task before, watch Gorilla's own walkthrough first: [Tutorial: Adding a custom script to a Gorilla GUI Task (YouTube)](https://www.youtube.com/watch?v=aW10fZIdlXY). The short version:

1. Open your task in the Task Builder editor.
2. Go to the **Scripts** tab (usually in the left-hand panel, sometimes under a "</>" or code icon).
3. Add a new script and paste in the full contents of the `.ts` file you want to use.
4. Save. The new component now shows up in the object/component picker, wherever that type of component belongs (e.g. under "Components" for object-level scripts, or under "Randomisation" for spreadsheet scripts).
5. Add it to your object/screen/spreadsheet like any built-in component, and fill in its fields in the inspector on the right.

Official Gorilla documentation on scripting, for reference:

- [Scripting overview](https://support.gorilla.sc/support/tools/scripting) — the starting point for all of the below.
- [Object-Component System](https://support.gorilla.sc/support/tools/object-component-system) — how objects, components, and factories fit together (background reading, not required to just use these scripts).
- [Form Fields Reference](https://support.gorilla.sc/support/tools/scripting/form-fields) — the building blocks used to make a script's settings show up in the inspector.
- [Lifecycle Methods](https://support.gorilla.sc/support/tools/scripting/lifecycle-methods) — when `initialise()`, `screenStart()`, etc. run.
- [Types Reference](https://support.gorilla.sc/support/tools/scripting/types-reference) — types and interfaces used by the Gorilla scripting system.
- [Binding Guide](https://support.gorilla.sc/support/tools/binding-guide) — how a script's fields get connected ("bound") to spreadsheet columns or Store fields.
- [Store documentation](https://support.gorilla.sc/support/tools/task-builder-2/how-to#store) — Gorilla's mechanism for passing values between screens/components.
- [Spreadsheet Randomisation guide](https://support.gorilla.sc/support/tools/task-builder-2/how-to#usingspreadsheetrandomisation) and the [worked example task](https://app.gorilla.sc/admin/task/605070) — relevant to `SOLORandomizeColumnGroups.ts` below.
- [Task Builder 2 Scripting Examples project](https://app.gorilla.sc/admin/project/96948) — a library of small demo tasks showing scripting features in action.

If something in a script doesn't behave as expected, Gorilla's [Debugging Guide](https://support.gorilla.sc/support/troubleshooting-and-technical/debugging) explains how to open your browser's developer console to see the log messages these scripts print (they're written to log fairly verbosely on purpose, to make problems easier to diagnose).

## What each script does

### `SOLOFreeDraggable.ts` + `ImagePercentViewer.md` — go together

**`SOLOFreeDraggable.ts`** is for tasks where a participant drags an object anywhere onto an image (for example, a memory task: "drag this picture to where you remember seeing it on the map"), rather than dropping it into one of Gorilla's fixed Dropzones. It measures where the object was dropped, compares that to a "correct" target position you supply, and records the distance between them.

Positions are measured as a **percentage of the background/map image itself** (0–100 on each axis, top-left corner = 0,0) — not pixels, and not Gorilla's own grid/stage coordinates. This matters because the image is usually smaller than, or positioned differently within, the full task screen, so using screen coordinates would give the wrong answer.

**`ImagePercentViewer.md`** is the companion piece: a short recipe for figuring out those percentage coordinates for your own image, using nothing but your web browser. You open your map/stimulus image directly in a browser tab, paste a small snippet into the browser's developer console, and hover your mouse over each point of interest — the console shows you the percentage position live. You note those numbers down and put them into your spreadsheet as the "correct" target columns that `SOLOFreeDraggable.ts` reads.

In short: use `ImagePercentViewer.md` first, to work out the correct coordinates for your stimuli; use `SOLOFreeDraggable.ts` in your task to actually collect and score participants' drag responses against those coordinates.

### `SOLOEraserToggle.ts`

A self-contained draw/erase toggle button for use with Gorilla's built-in Canvas Painting component (drawing tasks, e.g. copying a figure or free drawing). Normally, switching between a "pen" and an "eraser" in a drawing task takes some extra setup. This script renders its own button that flips between a draw colour/width and an eraser colour/width with a single click — no extra Store fields or Save Response components required. You set the pen colour, pen width, eraser colour, and eraser width (plus the button's labels and appearance) in the inspector.

### `SOLORandomizeColumnGroups.ts`

A **Spreadsheet Randomisation** component (added via the Spreadsheet tab, not to an object or screen — see the [Spreadsheet Randomisation guide](https://support.gorilla.sc/support/tools/task-builder-2/how-to#usingspreadsheetrandomisation)). Use this when your spreadsheet has several "slots" per row that each bundle a few related columns together (e.g. `img_1`/`x_1`/`y_1`, `img_2`/`x_2`/`y_2`, and so on), and you want those bundles shuffled into a random order for each participant — while keeping each bundle's own values glued together (so `img_1`'s picture always stays paired with its own `x_1`/`y_1`, it just might end up shown in slot 2 or 3 instead of slot 1).

You configure this entirely in the inspector: a comma-separated list of column prefixes (e.g. `img,x,y`) and how many numbered slots exist (e.g. `4`). No spreadsheet columns need to be renamed as long as they already follow the `prefix_number` pattern.

### `SOLORandomizeRotationInStore.ts`

A small utility component that generates a random whole number between 0 and 359 (i.e. a random compass/rotation angle) at the start of a screen, and writes it into a Store field of your choosing. Useful whenever you want an object to start at a random rotation without having to pre-generate that random value in your spreadsheet — for example, as the starting angle for a rotation task.

## A note on the file types

The `.ts` files are TypeScript, Gorilla's scripting language for the Task Builder (see the [scripting overview](https://support.gorilla.sc/support/tools/scripting) and [TypeScript docs](https://www.typescriptlang.org/) if you're curious how it works under the hood) — but using them doesn't require writing or understanding TypeScript yourself. Paste the whole file into Gorilla's Scripts tab as-is; all the settings you'll actually touch appear as ordinary form fields in the inspector, exactly like Gorilla's built-in components.
