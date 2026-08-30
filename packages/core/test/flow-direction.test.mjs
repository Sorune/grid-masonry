import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHorizontalMasonryLayout,
  calculateMasonryLayout,
  createMasonryState,
  GridMasonryError,
} from "../dist/index.js";

const verticalItems = [
  { id: "a", aspectRatio: 1 },
  { id: "b", aspectRatio: 2 },
  { id: "c", aspectRatio: 0.75, layoutHint: { columnSpan: 2 } },
  { id: "d", aspectRatio: 1.5 },
];

const horizontalItems = verticalItems.map(({ id, aspectRatio, layoutHint }) => ({
  id,
  aspectRatio,
  ...(layoutHint === undefined ? {} : { layoutHint: { rowSpan: layoutHint.columnSpan } }),
}));

function assertNoOverlap(cells) {
  for (let left = 0; left < cells.length; left += 1) {
    for (let right = left + 1; right < cells.length; right += 1) {
      const a = cells[left];
      const b = cells[right];
      const xOverlap = a.x < b.x + b.width && b.x < a.x + a.width;
      const yOverlap = a.y < b.y + b.height && b.y < a.y + a.height;
      assert.equal(xOverlap && yOverlap, false);
    }
  }
}

test("forward is the unchanged default and reverse mirrors vertical flow", () => {
  const baseOptions = {
    containerWidth: 620,
    minColumnWidth: 180,
    minColumns: 3,
    maxColumns: 3,
    gap: 8,
  };
  for (const flowDistribution of ["start", "end", "center", "space-between", "space-evenly"]) {
    const options = { ...baseOptions, flowDistribution };
    const implicit = calculateMasonryLayout(verticalItems, options);
    const forward = calculateMasonryLayout(verticalItems, { ...options, flowDirection: "forward" });
    const reverse = calculateMasonryLayout(verticalItems, { ...options, flowDirection: "reverse" });
    assert.deepEqual(implicit, forward);
    for (const cell of forward.cells) {
      const mirrored = reverse.cells.find((candidate) => candidate.id === cell.id);
      assert.equal(mirrored?.x, cell.x);
      assert.equal(mirrored?.y, implicit.containerHeight - (cell.y + cell.height));
      assert.equal(mirrored?.width, cell.width);
      assert.equal(mirrored?.height, cell.height);
      assert.equal(mirrored?.column, cell.column);
      assert.equal(mirrored?.columnSpan, cell.columnSpan);
    }
    assert.deepEqual(reverse.cells.map((cell) => cell.id), forward.cells.map((cell) => cell.id));
    assertNoOverlap(reverse.cells);
  }
});

test("reverse mirrors horizontal flow for every distribution without changing rows", () => {
  const base = {
    containerHeight: 620,
    minRowHeight: 180,
    minRows: 3,
    maxRows: 3,
    gap: 8,
  };
  for (const flowDistribution of ["start", "end", "center", "space-between", "space-evenly"]) {
    const forward = calculateHorizontalMasonryLayout(
      horizontalItems,
      { ...base, flowDistribution, flowDirection: "forward" },
    );
    const reverse = calculateHorizontalMasonryLayout(
      horizontalItems,
      { ...base, flowDistribution, flowDirection: "reverse" },
    );
    for (const cell of forward.cells) {
      const mirrored = reverse.cells.find((candidate) => candidate.id === cell.id);
      assert.equal(mirrored?.x, forward.containerWidth - (cell.x + cell.width));
      assert.equal(mirrored?.y, cell.y);
      assert.equal(mirrored?.row, cell.row);
      assert.equal(mirrored?.rowSpan, cell.rowSpan);
    }
    assertNoOverlap(reverse.cells);
  }
});

test("invalid flow direction is rejected by both public calculators", () => {
  assert.throws(
    () => calculateMasonryLayout([], { containerWidth: 320, minColumnWidth: 160, flowDirection: "sideways" }),
    (error) => error instanceof GridMasonryError && error.code === "INVALID_OPTION",
  );
  assert.throws(
    () => calculateHorizontalMasonryLayout([], { containerHeight: 320, minRowHeight: 160, flowDirection: "sideways" }),
    (error) => error instanceof GridMasonryError && error.code === "INVALID_OPTION",
  );
});

test("reverse state append uses the reversed calculator in both axes", () => {
  const verticalOptions = {
    containerWidth: 320,
    minColumnWidth: 150,
    minColumns: 2,
    maxColumns: 2,
    gap: 8,
    flowDirection: "reverse",
  };
  const verticalItems = [{ id: "a", aspectRatio: 1 }];
  const vertical = createMasonryState({ axis: "vertical", items: verticalItems, options: verticalOptions });
  const verticalAdded = { id: "b", aspectRatio: 2 };
  assert.deepEqual(
    vertical.append(verticalAdded),
    calculateMasonryLayout([...verticalItems, verticalAdded], verticalOptions),
  );

  const horizontalOptions = {
    containerHeight: 320,
    minRowHeight: 150,
    minRows: 2,
    maxRows: 2,
    gap: 8,
    flowDirection: "reverse",
  };
  const horizontalItems = [{ id: "a", aspectRatio: 1 }];
  const horizontal = createMasonryState({ axis: "horizontal", items: horizontalItems, options: horizontalOptions });
  const horizontalAdded = { id: "b", aspectRatio: 2 };
  assert.deepEqual(
    horizontal.append(horizontalAdded),
    calculateHorizontalMasonryLayout([...horizontalItems, horizontalAdded], horizontalOptions),
  );
});
