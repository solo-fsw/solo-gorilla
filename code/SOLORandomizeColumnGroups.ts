//------------------------------------------------------------------------------
// SOLO-RandomiseColumnGroups
//
// WHAT IT DOES
// A Spreadsheet Randomisation Component. For each row, shuffles the order
// of a group of columns, while keeping each group's own columns
// together (e.g. img_1/x_1/y_1 stays as one unit, but which position -
// slot 1, 2, 3, or 4 - it ends up in is randomised independently per row).
//
// EXAMPLE
// Given columns: img_1, x_1, y_1, img_2, x_2, y_2, img_3, x_3, y_3, img_4, x_4, y_4
// Row before: img_1=nebula1.jpg, x_1=0, y_1=5, img_2=curiosity.jpg, x_2=-1, y_2=1, ...
// After shuffling, the values nebula1.jpg/0/5 might end up in the img_3/x_3/y_3
// position instead of img_1/x_1/y_1 - but nebula1.jpg is always still paired
// with 0 and 5, wherever it lands. Every row is shuffled independently and
// per participant.
//
// HOW IT IS USED
// - Add this as a Spreadsheet Randomisation Component (Spreadsheet tab >
//   Add Randomisation > Add Component > search "SOLO-RandomiseColumnGroups").
// - "Group Prefixes" and "Number of Groups" are editable directly in the
//   Gorilla inspector.
//       - Group Prefixes takes a comma-separated list, e.g. "img,x,y".
//       - Number of Groups is how many numbered sets exist, e.g. 4.
//    - BOTH must be filled in - while either is blank (e.g. mid-typing), randomisation is skipped entirely and rows are returned unchanged, to avoid errors while the component is still being configured.
// - Column names must follow a consistent pattern: prefix + "_" + group
//   number, e.g. img_1, x_1, y_1 / img_2, x_2, y_2, etc.
// - This component runs ONCE per participant, applied to the whole
//   spreadsheet, shuffling EVERY row independently.
//
// GOTCHAS
// - Column names must exactly match Group Prefixes + "_" + group number
//   (1-based), e.g. prefixes img,x,y with 4 groups expects img_1, x_1,
//   y_1, img_2, x_2, y_2, img_3, x_3, y_3, img_4, x_4, y_4. If your
//   spreadsheet uses different naming, change Group Prefixes / Number of
//   Groups in the inspector, or rename spreadsheet columns.
// - Rows that are missing one or more expected columns are left unshuffled
//   and a console warning is logged, rather than silently corrupting data.
// - This does not touch any columns outside the defined groups (e.g.
//   "display" stays as-is).
// - CONFIRMED IN TESTING: Gorilla's editor "Preview Randomisation" (eye
//   icon) calls randomiseSpreadsheet() with `columns` as undefined, even
//   though a live/real run passes it correctly. The code below guards
//   against this by falling back to Object.keys(rows[0]) when `columns`
//   is falsy - do not remove this fallback, or the eye-icon preview will
//   throw and silently fail (no colour change, error only visible in
//   DevTools console).
// - Base class and registration category confirmed directly from Gorilla's
//   own auto-generated "Spreadsheet Randomisation Component" script
//   template (BaseRandomiseSpreadsheet / BaseRandomiseSpreadsheetFactory /
//   registerSimple('taskSpreadsheetRandomisationComponent', ...)) - this is
//   a different category from ordinary Task/Screen components.
//------------------------------------------------------------------------------

import {
  registerSimple,
  registerEditor,
  component,
  BaseRandomiseSpreadsheet,
  BaseRandomiseSpreadsheetFactory,
} from "@gorilla/compiled/task-builder.js";

//------------------------------------------------------------------------------
// PLACEHOLDER STATE - these are only used as harmless initial values before
// the editor fields have been filled in. They are NOT used as silent
// fallbacks - if Group Prefixes / Number of Groups are left blank in the
// inspector, randomiseSpreadsheet() bails out and does nothing (see
// resolveSettings() below), rather than randomising with a guessed default.
//------------------------------------------------------------------------------
const DEFAULT_GROUP_PREFIXES = ["img", "x", "y"];
const DEFAULT_NUM_GROUPS = 4;

export interface SOLORandomiseColumnGroupsFactory extends BaseRandomiseSpreadsheetFactory {
  // Comma-separated list of column prefixes that make up ONE group, in the
  // order they should stay bundled together, e.g. "img,x,y". Must be
  // filled in - randomisation is skipped entirely while this is blank.
  groupPrefixes: string;

  // How many numbered groups exist, e.g. 4 means groups 1 through 4. Must
  // be filled in - randomisation is skipped entirely while this is blank.
  numGroups: string;
}

//------------------------------------------------------------------------------
@component("base.component.SOLORandomiseColumnGroups")
export class SOLORandomiseColumnGroups extends BaseRandomiseSpreadsheet<SOLORandomiseColumnGroupsFactory> {
  private groupPrefixes: string[] = DEFAULT_GROUP_PREFIXES;
  private numGroups: number = DEFAULT_NUM_GROUPS;

  private resolveSettings(): boolean {
    const rawPrefixes = this.factory.groupPrefixes;
    if (rawPrefixes && rawPrefixes.trim().length > 0) {
      this.groupPrefixes = rawPrefixes
        .split(",")
        .map((p: string) => p.trim())
        .filter((p: string | any[]) => p.length > 0);
    } else {
      // No value typed yet - do not fall back to defaults silently here;
      // treat as "not ready" so randomiseSpreadsheet() can bail out
      // cleanly instead of running with a half-typed value.
      return false;
    }

    if (this.groupPrefixes.length === 0) {
      return false;
    }

    const rawNumGroupsStr = this.factory.numGroups;
    if (!rawNumGroupsStr || rawNumGroupsStr.trim().length === 0) {
      return false;
    }
    const rawNumGroups = parseInt(rawNumGroupsStr, 10);
    if (isNaN(rawNumGroups) || rawNumGroups <= 0) {
      return false;
    }
    this.numGroups = rawNumGroups;

    return true;
  }

  private shuffle<T>(arr: T[]): T[] {
    const result = arr.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Builds the list of column names for group number `groupNum` (1-based),
  // e.g. groupNum=2 with GROUP_PREFIXES=["img","x","y"] returns
  // ["img_2", "x_2", "y_2"].
  private columnsForGroup(groupNum: number): string[] {
    return this.groupPrefixes.map((prefix) => `${prefix}_${groupNum}`);
  }

  public randomiseSpreadsheet(name: string, columns: string[], rows: any[]) {
    const settingsReady = this.resolveSettings();
    if (!settingsReady) {
      // Group Prefixes / Number of Groups not filled in yet (e.g. still
      // being typed in the editor). Do nothing rather than guessing with
      // defaults, and return rows completely unchanged.
      console.log(
        "SOLORandomiseColumnGroups: Group Prefixes / Number of Groups not yet set - skipping randomisation for now.",
      );
      return rows;
    }

    const groupNumbers = Array.from(
      { length: this.numGroups },
      (_, i) => i + 1,
    );

    // The editor's Preview Randomisation feature has been observed calling
    // this method with `columns` as undefined, even though a live run
    // passes it correctly. Guard against that by falling back to the keys
    // of the first row, which are available either way.
    const availableColumns: string[] =
      columns || (rows && rows[0] ? Object.keys(rows[0]) : []);

    // Verify all expected columns exist in this spreadsheet before doing
    // anything, so we fail loudly instead of silently skipping data.
    const allExpectedColumns: string[] = [];
    groupNumbers.forEach((g) => {
      this.columnsForGroup(g).forEach((c) => allExpectedColumns.push(c));
    });
    const missingColumns = allExpectedColumns.filter(
      (c) => availableColumns.indexOf(c) === -1,
    );
    if (missingColumns.length > 0) {
      console.log(
        `SOLORandomiseColumnGroups: spreadsheet "${name}" is missing expected columns [${missingColumns.join(
          ", ",
        )}] - skipping randomisation entirely for this spreadsheet.`,
      );
      return rows;
    }

    const shuffledRows = rows.map((row, rowIndex) => {
      // Confirm every expected column has a value in this row (not
      // undefined) before shuffling it - leave the row untouched otherwise.
      const rowHasAllValues = allExpectedColumns.every(
        (c) => row[c] !== undefined,
      );
      if (!rowHasAllValues) {
        console.log(
          `SOLORandomiseColumnGroups: row ${rowIndex} is missing one or more expected values - leaving this row unshuffled.`,
        );
        return row;
      }

      // Snapshot each group's values as a bundle, in original group order.
      const groupBundles = groupNumbers.map((g) => {
        const cols = this.columnsForGroup(g);
        const bundle: Record<string, any> = {};
        cols.forEach((c) => (bundle[c] = row[c]));
        return bundle;
      });

      // Shuffle the ORDER of the bundles (not their contents).
      const shuffledBundles = this.shuffle(groupBundles);

      // Rebuild the row: group N's column names (img_N, x_N, y_N) now hold
      // whichever bundle landed in position N after shuffling.
      const newRow = { ...row };
      groupNumbers.forEach((g, i) => {
        const cols = this.columnsForGroup(g);
        const bundle = shuffledBundles[i];
        cols.forEach((c, colIdx) => {
          // bundle's own keys are the ORIGINAL column names (e.g. img_3),
          // so map by position within GROUP_PREFIXES rather than by key,
          // to correctly move values into the NEW column names (img_N).
          const originalPrefixKey = Object.keys(bundle)[colIdx];
          newRow[c] = bundle[originalPrefixKey];
        });
      });

      return newRow;
    });

    console.log(
      `SOLORandomiseColumnGroups: shuffled ${shuffledRows.length} row(s) across ${this.numGroups} groups for spreadsheet "${name}".`,
    );

    return shuffledRows;
  }
}

//------------------------------------------------------------------------------
registerEditor("SOLORandomiseColumnGroups", {
  label: "SOLO-RandomiseColumnGroups",
  icon: "fas fa-dice",
  form: {
    elements: [
      {
        class: "FormElementText",
        field: "groupPrefixes",
        label: "Group Prefixes (comma-separated, e.g. img,x,y)",
      },
      {
        class: "FormElementText",
        field: "numGroups",
        label: "Number of Groups (e.g. 4)",
      },
    ],
  },
});

//------------------------------------------------------------------------------
registerSimple(
  "taskSpreadsheetRandomisationComponent",
  "SOLORandomiseColumnGroups",
  {
    description:
      "Shuffles the order of grouped columns per row (e.g. img_1/x_1/y_1, img_2/x_2/y_2, ...) so each group's values stay bundled together, but which position they land in is randomised per row. Group Prefixes and Number of Groups are configurable in the inspector.",
    factory: {
      groupPrefixes: DEFAULT_GROUP_PREFIXES.join(","),
      numGroups: String(DEFAULT_NUM_GROUPS),
    },
  },
);
//------------------------------------------------------------------------------
