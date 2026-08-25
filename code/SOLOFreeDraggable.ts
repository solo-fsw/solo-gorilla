//------------------------------------------------------------------------------
// SOLOFreeDraggable
//
// Draggable object that can be dropped ANYWHERE on the stage (not snapped
// to a fixed Dropzone). Used for arecall task: participant sees a
// picture of an object encountered earlier, and drags it to where they
// think it was on a map.
//
// COORDINATE SYSTEM - PERCENT OF THE MAP IMAGE
//   This component reports position as a PERCENT (0-100 on each axis,
//   origin top-left) of the MAP BACKGROUND IMAGE's own rendered bounding
//   box - NOT the full Gorilla stage, and NOT grid coordinates.
//
//   This distinction matters because the map / background is a single Image
//   component
//   Gorilla fits that image within its own object bounds preserving
//   aspect ratio (max-width/max-height: 100% on the <img>), and that
//   object's bounds do not necessarily fill the whole stage - there can
//   be a size/position difference between "the map image" and "the
//   stage". Computing drop position relative to the stage
//   gives wrong coordinates whenever the
//   map doesn't exactly fill the stage - which is the normal case.
//
//   getMapImageRect() finds the map's actual <img> element (matched by
//   the mapImageFilename setting) and uses its rendered
//   getBoundingClientRect() as the coordinate frame instead. This means:
//   propX=0/propY=0 is the top-left corner of the map image itself,
//   not the stage's top-left corner - matching what you actually care
//   about when placing objects onto specific points on the map.
//
//   TO USE THIS WITH YOUR SPREADSHEET:
//   1. Set the mapImageFilename setting to a distinctive substring of
//      your map image's filename (e.g. "map_with_numbers_redrawn.png").
//   2. For each object's correct target location, determine its position
//      as a percent of the MAP IMAGE's own width/height (0-100, top-left
//      origin) - e.g. by cropping/inspecting the source image file
//      directly. See the ImagePercentViewer.md
//      This does NOT depend on Gorilla's stage/grid system at all,
//      since it's just the image's own pixel dimensions.
//   3. Put those percent values in your spreadsheet's target columns.
//
// On pointerup:
//   - reads the "correct" target position from spreadsheet-bound Target X
//     / Target Y settings, in PERCENT OF STAGE (0-100, origin top-left)
//   - computes the CENTER of this dragged object's own bounding box at
//     drop time (not raw pointer position), as a percent of the stage
//   - computes Euclidean distance between drop point and target, in
//     percent-of-stage units (NOT grid units - see note above)
//   - OPTIONALLY reads an additional spreadsheet column (e.g. an object
//     label/name) via the Object Label setting - leave unbound to skip
//   - submits a response via triggerResponse containing dropX, dropY,
//     targetX, targetY, distance, and objectLabel as a JSON string
//     (recorded in the Response column of your data)
//   - ALSO writes each value SEPARATELY to its own bindable Store field
//     (Drop X, Drop Y, Target X Store, Target Y Store, Distance, Object
//     Label), so you can name each Store field yourself and use them
//     independently elsewhere in the task (e.g. feedback, branching,
//     summary screens). Each write destination is optional - leave any
//     unbound to skip writing that one.
//
// SETUP REQUIRED:
//   - Add this component to the SAME object as an Image component (this
//     component is not itself a drawable - it needs this.drawableFrame,
//     which only exists if a TaskDrawable, e.g. Image, is on the object).
//   - Bind Target X / Target Y (chain-link/bind icon) to spreadsheet
//     columns holding the correct position for this trial, in PERCENT OF
//     STAGE (0-100, origin top-left) - see coordinate system note above
//     for how to obtain these values from Gorilla's own editor.
//   - OPTIONAL: bind Object Label to a spreadsheet column (e.g. an object
//     name/identifier) if you want it included in the response. Leave
//     unbound to skip - it will resolve to an empty string and still be
//     included in the data as "".
//   - OPTIONAL: bind any of the six "Write … To" fields to Store fields
//     (create new or pick existing) if you want that individual value
//     written to the Store, named however you like. Leave any unbound to
//     skip writing that one.
//
// OTHER SETUP:
//   - To advance the screen once this response is given, add a matching
//     Advance - Response component on the Screen tab (separate from this
//     Object-level component).
//------------------------------------------------------------------------------

import {
  TaskComponent,
  TaskComponentFactory,
  component,
  registerEditor,
  registerSimple,
  ResponseType,
  Binding,
} from "@gorilla/compiled/task-builder.js";
//------------------------------------------------------------------------------
const DECIMAL_PLACES = 2;
//------------------------------------------------------------------------------
export interface SOLOFreeDraggableFactory extends TaskComponentFactory {
  objectLabel: string; // OPTIONAL: value read from a spreadsheet column (e.g. object name/identifier). Bind to spreadsheet. Leave unbound to skip - resolves to "".

  targetX: string; // correct X position, in PERCENT OF THE MAP IMAGE (0-100, 0 = left edge, 100 = right edge of the map image itself, NOT the stage). Bind to spreadsheet. Resolved + parsed at runtime.
  targetY: string; // correct Y position, in PERCENT OF THE MAP IMAGE (0-100, 0 = top edge, 100 = bottom edge). Bind to spreadsheet. Resolved + parsed at runtime.

  mapImageFilename: string; // Filename (or distinctive substring) of the map background image's src, e.g. "map_with_numbers_redrawn.png". Used to locate the map image's own DOM element so drop position can be computed relative to the MAP itself, not the full stage - required because the map image does not necessarily fill the whole stage (it is fit within its own object bounds, which may be smaller/positioned differently).

  stageAspectRatio: string; // Gorilla stage aspect ratio as "width:height", default "4:3". Used as a fallback only if the map image element cannot be found.

  writeDropX: string; // OPTIONAL: Store field to write the drop X (percent of stage) to
  writeDropY: string; // OPTIONAL: Store field to write the drop Y (percent of stage) to
  writeTargetX: string; // OPTIONAL: Store field to write the (resolved) target X (percent of stage) to
  writeTargetY: string; // OPTIONAL: Store field to write the (resolved) target Y (percent of stage) to
  writeDistance: string; // OPTIONAL: Store field to write the distance (in percent-of-stage units) to
  writeObjectLabel: string; // OPTIONAL: Store field to write objectLabel to
}
//------------------------------------------------------------------------------
@component("task.component.SOLOFreeDraggable")
export class SOLOFreeDraggable extends TaskComponent<SOLOFreeDraggableFactory> {
  private dragging = false;
  private grabOffsetX = 0;
  private grabOffsetY = 0;
  private el: HTMLElement | null = null;
  private stageEl: HTMLElement | null = null;

  private onPointerDownBound = (e: PointerEvent) => this.onPointerDown(e);
  private onPointerMoveBound = (e: PointerEvent) => this.onPointerMove(e);
  private onPointerUpBound = (e: PointerEvent) => this.onPointerUp(e);

  private dropXBinding: Binding;
  private dropYBinding: Binding;
  private targetXBinding: Binding;
  private targetYBinding: Binding;
  private distanceBinding: Binding;
  private objectLabelBinding: Binding;

  public construct() {
    this.dropXBinding = this.createBinding();
    this.dropYBinding = this.createBinding();
    this.targetXBinding = this.createBinding();
    this.targetYBinding = this.createBinding();
    this.distanceBinding = this.createBinding();
    this.objectLabelBinding = this.createBinding();
    super.construct();
  }

  public apply(f: SOLOFreeDraggableFactory) {
    if (!f.stageAspectRatio) f.stageAspectRatio = "4:3";
    if (!f.mapImageFilename)
      console.error(
        "[SOLOFreeDraggable] mapImageFilename is not set - drop position will fall back to full-stage coordinates, which will be WRONG if the map image does not fill the whole stage.",
      );

    this.dropXBinding.parseIfExists(f.writeDropX);
    this.dropYBinding.parseIfExists(f.writeDropY);
    this.targetXBinding.parseIfExists(f.writeTargetX);
    this.targetYBinding.parseIfExists(f.writeTargetY);
    this.distanceBinding.parseIfExists(f.writeDistance);
    this.objectLabelBinding.parseIfExists(f.writeObjectLabel);

    super.apply(f);
  }

  public screenStart() {
    this.el = this.drawableFrame
      ? (this.drawableFrame.get(0) as HTMLElement)
      : null;

    if (!this.el) {
      console.error(
        "[SOLOFreeDraggable] this.drawableFrame is null - add this component to the same object as an Image (or other drawable) component.",
      );
      return;
    }

    this.el.style.position = "absolute";
    this.el.style.cursor = "grab";
    this.el.style.touchAction = "none";

    this.stageEl = this.getStageEl();

    if (!this.stageEl) {
      console.error(
        "[SOLOFreeDraggable] Could not locate stage container element. Drop coordinates will be incorrect.",
      );
    }

    console.log(
      "[SOLOFreeDraggable] Target (correct) position, percent of stage:",
      {
        targetX: parseFloat(this.injectBindings(this.factory.targetX)),
        targetY: parseFloat(this.injectBindings(this.factory.targetY)),
      },
    );

    this.el.addEventListener("pointerdown", this.onPointerDownBound);
  }

  // Finds the real positioning container that dragged objects' left/top
  // pixel values are relative to. Confirmed via DevTools: this element
  // has no distinguishing class/id, but is identifiable as the first
  // ancestor with computed position: absolute and inset: 0 (top/left/
  // right/bottom all 0px) - it is the direct parent of the map image,
  // draggable objects, and the Confirm button.
  private getStageEl(): HTMLElement | null {
    let node = this.el?.parentElement || null;
    while (node) {
      const style = getComputedStyle(node);
      if (
        style.position === "absolute" &&
        style.top === "0px" &&
        style.left === "0px" &&
        style.right === "0px" &&
        style.bottom === "0px"
      ) {
        return node;
      }
      node = node.parentElement;
    }
    console.error(
      "[SOLOFreeDraggable] Stage container not found via inset:0 pattern - falling back to parentElement, coordinates may be wrong.",
    );
    return this.el?.parentElement || null;
  }

  // Computes the actual letterboxed/pillarboxed stage rect (Gorilla's
  // fixed-aspect-ratio virtual stage) centered within the outer element
  // rect. The outer element (this.stageEl) fills the whole viewport
  // area, but Gorilla only uses a centered sub-rect matching the
  // configured aspect ratio - any leftover space is blank margin. This
  // must be used for all proportion/percent math, not the raw outer
  // rect. Empirically confirmed correct via live center-drop testing.
  private getLetterboxedStageRect(outerRect: DOMRect): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    const ratioStr =
      this.injectBindings(this.factory.stageAspectRatio) || "4:3";
    const parts = ratioStr.split(":").map((p: string) => parseFloat(p.trim()));
    const ratioW = parts[0] || 4;
    const ratioH = parts[1] || 3;
    const targetRatio = ratioW / ratioH;

    const outerRatio = outerRect.width / outerRect.height;

    let stageWidth: number;
    let stageHeight: number;

    if (outerRatio > targetRatio) {
      // outer is wider than stage ratio -> pillarboxed (blank bars on left/right)
      stageHeight = outerRect.height;
      stageWidth = stageHeight * targetRatio;
    } else {
      // outer is taller than stage ratio -> letterboxed (blank bars on top/bottom)
      stageWidth = outerRect.width;
      stageHeight = stageWidth / targetRatio;
    }

    const stageLeft = outerRect.left + (outerRect.width - stageWidth) / 2;
    const stageTop = outerRect.top + (outerRect.height - stageHeight) / 2;

    return {
      left: stageLeft,
      top: stageTop,
      width: stageWidth,
      height: stageHeight,
    };
  }

  // Finds the map background image's own rendered bounding box, which
  // is what target/drop coordinates should actually be relative to -
  // NOT the full stage. The map is a single Image component that may
  // not fill the whole stage (Gorilla fits images within their own
  // object bounds preserving aspect ratio, via max-width/max-height:
  // 100% on the <img> itself), so using stage bounds directly gives
  // wrong coordinates whenever the map's own object box differs from
  // the stage box.
  //
  // Matches by searching all <img> elements inside the stage container
  // for one whose src contains the configured mapImageFilename
  // substring (not exact match, since Gorilla appends a cache-busting
  // ?v=… query string that can change). Returns the rendered
  // getBoundingClientRect() of the <img> element itself (not its
  // wrapper), since max-width/max-height:100% means the <img>'s own
  // rendered box already reflects its true on-screen size and
  // position after aspect-ratio fitting.
  private getMapImageRect(): DOMRect | null {
    if (!this.stageEl) return null;
    const filename = this.injectBindings(this.factory.mapImageFilename);
    if (!filename) return null;

    const images = this.stageEl.querySelectorAll("img");
    for (let i = 0; i < images.length; i++) {
      const img = images[i] as HTMLImageElement;
      if (img.src && img.src.includes(filename)) {
        return img.getBoundingClientRect();
      }
    }
    console.error(
      `[SOLOFreeDraggable] Could not find map image matching "${filename}" - falling back to full-stage coordinates.`,
    );
    return null;
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.el) return;
    this.dragging = true;
    this.el.setPointerCapture(e.pointerId);
    this.el.style.cursor = "grabbing";

    const rect = this.el.getBoundingClientRect();
    this.grabOffsetX = e.clientX - rect.left;
    this.grabOffsetY = e.clientY - rect.top;

    window.addEventListener("pointermove", this.onPointerMoveBound);
    window.addEventListener("pointerup", this.onPointerUpBound);
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragging || !this.el || !this.stageEl) return;

    const outerRect = this.stageEl.getBoundingClientRect();
    const mapRect = this.getMapImageRect();
    const boundsRect = mapRect || this.getLetterboxedStageRect(outerRect);
    const elW = this.el.offsetWidth;
    const elH = this.el.offsetHeight;

    // el.style.left/top are set relative to this.stageEl (the outer
    // container), so convert the bounding rect's viewport-relative
    // position back into outer-relative pixels for clamping
    const boundsLeftRelative = boundsRect.left - outerRect.left;
    const boundsTopRelative = boundsRect.top - outerRect.top;

    let newLeft = e.clientX - outerRect.left - this.grabOffsetX;
    let newTop = e.clientY - outerRect.top - this.grabOffsetY;

    newLeft = Math.max(
      boundsLeftRelative,
      Math.min(newLeft, boundsLeftRelative + boundsRect.width - elW),
    );
    newTop = Math.max(
      boundsTopRelative,
      Math.min(newTop, boundsTopRelative + boundsRect.height - elH),
    );

    this.el.style.left = `${newLeft}px`;
    this.el.style.top = `${newTop}px`;
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.dragging || !this.el || !this.stageEl) return;
    this.dragging = false;
    this.el.style.cursor = "grab";
    this.el.releasePointerCapture(e.pointerId);

    window.removeEventListener("pointermove", this.onPointerMoveBound);
    window.removeEventListener("pointerup", this.onPointerUpBound);

    this.submitDropResponse();
  }

  private submitDropResponse() {
    if (!this.el || !this.stageEl) return;

    const elRect = this.el.getBoundingClientRect();
    const outerRect = this.stageEl.getBoundingClientRect();
    const mapRect = this.getMapImageRect();
    const stageRect = mapRect || this.getLetterboxedStageRect(outerRect);

    // CENTER of the dragged object's bounding box, relative to the
    // MAP IMAGE's own rendered box (not the full stage - the map may
    // not fill the whole stage), as a 0-1 proportion (origin
    // top-left) - then expressed as PERCENT (0-100). Falls back to
    // full-stage coordinates only if the map image element could not
    // be located.
    const propX =
      (elRect.left - stageRect.left + elRect.width / 2) / stageRect.width;
    const propY =
      (elRect.top - stageRect.top + elRect.height / 2) / stageRect.height;

    const dropX = propX * 100;
    const dropY = propY * 100;

    // Target values are ALSO in percent of stage (0-100) - see
    // coordinate system note at top of file for how to populate
    // these in the spreadsheet using Gorilla's own Advanced
    // Positioning "Percent of stage" display.
    const targetX = parseFloat(this.injectBindings(this.factory.targetX));
    const targetY = parseFloat(this.injectBindings(this.factory.targetY));

    const distance = Math.sqrt(
      Math.pow(dropX - targetX, 2) + Math.pow(dropY - targetY, 2),
    );

    // OPTIONAL spreadsheet-bound value. If objectLabel is unbound,
    // injectBindings() resolves it to an empty string - safe to
    // include in the payload either way.
    const objectLabel = this.injectBindings(this.factory.objectLabel);

    const payload = {
      objectLabel,
      targetX,
      targetY,
      dropX: +dropX.toFixed(DECIMAL_PLACES),
      dropY: +dropY.toFixed(DECIMAL_PLACES),
      distance: +distance.toFixed(DECIMAL_PLACES),
      elRect,
      stageRect,
      propX,
      propY,
    };

    console.log(
      "[SOLOFreeDraggable] Submitting response (percent of stage):",
      payload,
    );

    this.triggerResponse({
      response: JSON.stringify(payload),
      responseType: ResponseType.Response,
    });

    // Also write each value separately to its own Store field, if a
    // destination has been bound for it. .write() is a no-op if the
    // corresponding write field is left unbound.
    this.dropXBinding.write(payload.dropX);
    this.dropYBinding.write(payload.dropY);
    this.targetXBinding.write(payload.targetX);
    this.targetYBinding.write(payload.targetY);
    this.distanceBinding.write(payload.distance);
    this.objectLabelBinding.write(payload.objectLabel);
  }

  public removeListeners() {
    if (this.el) {
      this.el.removeEventListener("pointerdown", this.onPointerDownBound);
    }
    window.removeEventListener("pointermove", this.onPointerMoveBound);
    window.removeEventListener("pointerup", this.onPointerUpBound);
  }
}
//------------------------------------------------------------------------------
registerEditor("SOLOFreeDraggable", {
  label: "SOLOFreeDraggable",
  icon: "far fa-circle",
  form: {
    elements: [
      {
        class: "FormElementBindableText",
        field: "objectLabel",
        label: "Object Label (bind to spreadsheet column, optional)",
      },
      {
        class: "FormElementBindableText",
        field: "targetX",
        label: "Target X (percent of MAP IMAGE, 0-100 - not stage)",
      },
      {
        class: "FormElementBindableText",
        field: "targetY",
        label: "Target Y (percent of MAP IMAGE, 0-100 - not stage)",
      },
      {
        class: "FormElementBindableText",
        field: "mapImageFilename",
        label:
          'Map Image Filename (e.g. "map_with_numbers_redrawn.png") - required',
      },
      {
        class: "FormElementBindableField",
        field: "writeObjectLabel",
        label: "Write Object Label To (Store field, optional)",
      },
      {
        class: "FormElementBindableField",
        field: "writeTargetX",
        label: "Write Target X To (Store field, optional)",
      },
      {
        class: "FormElementBindableField",
        field: "writeTargetY",
        label: "Write Target Y To (Store field, optional)",
      },
      {
        class: "FormElementBindableField",
        field: "writeDropX",
        label: "Write Drop X To (Store field, optional)",
      },
      {
        class: "FormElementBindableField",
        field: "writeDropY",
        label: "Write Drop Y To (Store field, optional)",
      },
      {
        class: "FormElementBindableField",
        field: "writeDistance",
        label: "Write Distance To (Store field, optional)",
      },
      {
        class: "FormElementBindableText",
        field: "stageAspectRatio",
        label:
          'Stage Aspect Ratio (e.g. "4:3") - must match Customisation setting',
      },
    ],
  },
});
//------------------------------------------------------------------------------
registerSimple("component", "SOLOFreeDraggable", {
  description:
    "Draggable object for a maze-recall task: participant drags a picture of a remembered object to where they think it was on a maze map. Freely droppable (no snapping), submits drop position, target position, distance, and an optional object label as a JSON response, and optionally writes each value separately to its own named Store field. Positions are in PERCENT OF THE MAP IMAGE (0-100, top-left origin) - not stage percent, not grid coordinates. Requires mapImageFilename to be set.",
});
//------------------------------------------------------------------------------
