import type {
  MasonryInitSettings,
  VerticalMasonryInitSettings,
} from "../../dist/index.js";

const vertical: MasonryInitSettings = {
  axis: "vertical",
  items: [{ id: "v", aspectRatio: 1, layoutHint: { columnSpan: 2 } }],
  options: { containerWidth: 320, minColumnWidth: 120 },
};

const horizontal: MasonryInitSettings = {
  axis: "horizontal",
  items: [{ id: "h", aspectRatio: 2, layoutHint: { rowSpan: 2 } }],
  options: { containerHeight: 240, minRowHeight: 100 },
};

const verticalOnly: VerticalMasonryInitSettings = vertical;
void horizontal;
void verticalOnly;

const wrongVerticalOption: MasonryInitSettings = {
  axis: "vertical",
  items: [],
  // @ts-expect-error horizontal option cannot be used for a vertical config
  options: { containerHeight: 240, minRowHeight: 100 },
};

const wrongHorizontalItem: MasonryInitSettings = {
  axis: "horizontal",
  // @ts-expect-error vertical item hints cannot be used for a horizontal config
  items: [{ id: "wrong", aspectRatio: 1, layoutHint: { columnSpan: 2 } }],
  options: { containerHeight: 240, minRowHeight: 100 },
};

void wrongVerticalOption;
void wrongHorizontalItem;
