import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export default function VirtualizedTeamTable({
  items,
  renderRow,
  rowHeight = 32,
  overscan = 8,
}) {
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      style={{
        height: "70vh",
        overflowY: "auto",
        overflowX: "auto",
      }}
    >
      <table className="screen2-table">
        <thead>
          <tr>
            {renderRow("header")}
          </tr>
        </thead>

        <tbody
          style={{
            position: "relative",
            display: "block",
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <tr
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(
                items[virtualRow.index],
                virtualRow.index
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
