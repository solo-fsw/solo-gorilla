//------------------------------------------------------------------------------
// SOLOEraserToggle
//
// Self-contained draw/erase toggle for a Canvas Painting component (Colour
// Mode = Single). Renders its own clickable button and holds the current
// mode entirely inside the component - no Store field, no Save Response,
// no dependency on Gorilla's Button component or its DOM structure.

// HOW IT WORKS:
// - Add is as a separate Object positioned wherever you want the toggle button to appear - either works, since it reaches the canvas via document.querySelector, not via drawableFrame.
// - Set "Draw Colour", "Draw Width (px)", "Eraser Colour" (normally your
//   canvas background colour) and "Eraser Width (px)" below.
// - Click the rendered button during the task to flip between draw/erase.
//
// Note:
// - Requires a plain background (= one color, no gradient etc)
//------------------------------------------------------------------------------
import {
  TaskDrawable,
  TaskDrawableFactory,
  component,
  registerEditor,
  registerSimple,
  drawableEditorForm,
  drawableDefaults,
} from "@gorilla/compiled/task-builder.js";
//------------------------------------------------------------------------------
export interface SOLOEraserToggleFactory extends TaskDrawableFactory {
  draw_colour: string;
  draw_width: string;
  eraser_colour: string;
  eraser_width: string;
  draw_label: string;
  erase_label: string;
  background_colour_draw_mode: string;
  background_colour_erase_mode: string;
  border_colour: string;
  border_width: string;
  border_radius: string;
}
//------------------------------------------------------------------------------
@component("task.component.SOLOEraserToggle")
export class SOLOEraserToggle extends TaskDrawable<SOLOEraserToggleFactory> {
  private isErasing = false;
  private onButtonClickBound = () => this.onButtonClick();

  public initialise() {
    super.initialise();
    console.log("[SOLOEraserToggle] initialise() called");

    const borderColour =
      this.injectBindings(this.factory.border_colour) || "#333333";
    const borderWidth = parseFloat(
      this.injectBindings(this.factory.border_width),
    );
    const borderRadius = parseFloat(
      this.injectBindings(this.factory.border_radius),
    );

    const buttonStyle = [
      "width:100%",
      "height:100%",
      "cursor:pointer",
      `border:${!isNaN(borderWidth) ? borderWidth : 2}px solid ${borderColour}`,
      `border-radius:${!isNaN(borderRadius) ? borderRadius : 6}px`,
    ].join(";");

    this.frame.html(
      `<button type="button" class="solo-eraser-toggle-btn" style="${buttonStyle}">${this.injectBindings(this.factory.draw_label) || "Erase"}</button>`,
    );
    const btn = this.frame.find(
      ".solo-eraser-toggle-btn",
    )[0] as HTMLButtonElement;
    if (btn) {
      btn.addEventListener("click", this.onButtonClickBound);
    } else {
      console.log("[SOLOEraserToggle] button element not found after render");
    }
  }

  public screenStart() {
    super.screenStart();
    console.log("[SOLOEraserToggle] screenStart() called");
    this.isErasing = false;
    this.applyBrushState();
    this.updateButtonAppearance();
  }

  private onButtonClick() {
    this.isErasing = !this.isErasing;
    console.log(`[SOLOEraserToggle] toggled, erasing=${this.isErasing}`);
    this.applyBrushState();
    this.updateButtonAppearance();
  }

  private updateButtonAppearance() {
    const btn = this.frame.find(
      ".solo-eraser-toggle-btn",
    )[0] as HTMLButtonElement;
    if (!btn) return;

    const drawLabel = this.injectBindings(this.factory.draw_label) || "Erase";
    const eraseLabel = this.injectBindings(this.factory.erase_label) || "Draw";
    btn.textContent = this.isErasing ? eraseLabel : drawLabel;

    const drawModeBackground =
      this.injectBindings(this.factory.background_colour_draw_mode) ||
      "#eeeeee";
    const eraseModeBackground =
      this.injectBindings(this.factory.background_colour_erase_mode) ||
      "#dddddd";
    btn.style.backgroundColor = this.isErasing
      ? eraseModeBackground
      : drawModeBackground;

    console.log(
      `[SOLOEraserToggle] button appearance updated, erasing=${this.isErasing}, background=${btn.style.backgroundColor}`,
    );
  }

  private applyBrushState() {
    // Confirmed via DevTools: the rendered canvas only carries class
    // "w-full h-full" (not "painting-canvas" as compiled source's
    // jQuery constructor call implies). Scoped to .painting wrapper
    // to avoid matching an unrelated canvas elsewhere on the page.
    const canvasEl = document.querySelector(
      ".painting canvas",
    ) as HTMLCanvasElement;
    if (!canvasEl) {
      console.log("[SOLOEraserToggle] canvas not found, retrying in 200ms");
      setTimeout(() => this.applyBrushState(), 200);
      return;
    }
    const ctx = canvasEl.getContext("2d");
    if (!ctx) {
      console.log("[SOLOEraserToggle] canvas found but 2d context unavailable");
      return;
    }

    const drawColour =
      this.injectBindings(this.factory.draw_colour) || "#000000";
    const drawWidth = parseFloat(this.injectBindings(this.factory.draw_width));
    const eraserColour =
      this.injectBindings(this.factory.eraser_colour) || "#ffffff";
    const eraserWidth = parseFloat(
      this.injectBindings(this.factory.eraser_width),
    );

    if (!this.injectBindings(this.factory.draw_colour)) {
      console.log(
        "[SOLOEraserToggle] draw_colour was empty, falling back to #000000",
      );
    }
    if (!this.injectBindings(this.factory.eraser_colour)) {
      console.log(
        "[SOLOEraserToggle] eraser_colour was empty, falling back to #ffffff",
      );
    }

    const colour = this.isErasing ? eraserColour : drawColour;
    const width = this.isErasing ? eraserWidth : drawWidth;

    // Always assign unconditionally - no "if (colour)" guard. A blank
    // colour should surface as an obviously wrong stroke, not silently
    // leave the previous mode's colour in place.
    ctx.strokeStyle = colour;
    if (!isNaN(width)) {
      ctx.lineWidth = width;
    }
    console.log(
      `[SOLOEraserToggle] applied colour=${colour}, lineWidth=${width}, erasing=${this.isErasing}`,
    );
  }
}
//------------------------------------------------------------------------------
registerEditor("SOLOEraserToggle", {
  label: "SOLO-EraserToggle",
  icon: "fas fa-eraser",
  form: {
    elements: [
      {
        class: "FormElementBindableColor",
        field: "draw_colour",
        label: "Draw Colour",
      },
      {
        class: "FormElementBindableText",
        field: "draw_width",
        label: "Draw Width (px)",
      },
      {
        class: "FormElementBindableColor",
        field: "eraser_colour",
        label: "Eraser Colour",
      },
      {
        class: "FormElementBindableText",
        field: "eraser_width",
        label: "Eraser Width (px)",
      },
      {
        class: "FormElementBindableText",
        field: "draw_label",
        label: "Button Label (Draw mode)",
      },
      {
        class: "FormElementBindableText",
        field: "erase_label",
        label: "Button Label (Erase mode)",
      },
      {
        class: "FormElementBindableColor",
        field: "background_colour_draw_mode",
        label: "Background Colour (Draw mode)",
      },
      {
        class: "FormElementBindableColor",
        field: "background_colour_erase_mode",
        label: "Background Colour (Erase mode)",
      },
      {
        class: "FormElementBindableColor",
        field: "border_colour",
        label: "Border Colour",
      },
      {
        class: "FormElementBindableText",
        field: "border_width",
        label: "Border Width (px)",
      },
      {
        class: "FormElementBindableText",
        field: "border_radius",
        label: "Border Radius (px)",
      },
    ].concat(drawableEditorForm()),
  },
});
//------------------------------------------------------------------------------
registerSimple("component", "SOLOEraserToggle", {
  description:
    "Self-contained button that toggles Canvas Painting between draw and erase colour/width, no Store or Button dependency required",
  factory: drawableDefaults({
    draw_colour: "#000000",
    draw_width: "5",
    eraser_colour: "#ffffff",
    eraser_width: "20",
    draw_label: "Erase",
    erase_label: "Draw",
    background_colour_draw_mode: "#eeeeee",
    background_colour_erase_mode: "#dddddd",
    border_colour: "#333333",
    border_width: "2",
    border_radius: "6",
  }),
});
//------------------------------------------------------------------------------
