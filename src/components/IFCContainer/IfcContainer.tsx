import React, { forwardRef } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";

interface PropertyItem {
  modelID: number;
  expressID: number;
  name?: string;
  type?: string;
  properties?: Record<string, any>;
}

interface IfcContainerProps {
  viewer?: IfcViewerAPI;
  loadedModels?: Array<{ modelID: number }>;
  onShowProperties?: (items: PropertyItem[]) => void;
  onNodeSelect?: (selections: Array<{ modelID: number; expressID: number }>) => void;
}

export const IfcContainer = forwardRef<HTMLDivElement, IfcContainerProps>(
  function IfcContainerFunc(props, ref) {
    // No popover; properties flow to the PropertyPanel via parent callback

    const viewer = props.viewer;
    // No popover anchoring needed

    // No popover close handler

    const ifcOnDoubleClick = async (e?: React.MouseEvent<HTMLDivElement>) => {
      try {
        if (e) e.preventDefault();
        if (!viewer) {
          console.log('DoubleClick: viewer not ready');
          return;
        }
        console.log('DoubleClick: picking item...');
        
        // Use pickIfcItem without highlighting or camera adjustment
        const picked = await viewer.IFC.selector.pickIfcItem(false, false);
        console.log('DoubleClick: picked result', picked);
        
        if (!picked) {
          console.log('DoubleClick: no item picked');
          return;
        }
        
        // Mirror tree node selection behavior: delegate to onNodeSelect
        props.onNodeSelect?.([{ modelID: picked.modelID, expressID: picked.id }]);
      } catch (err) {
        console.error('DoubleClick: error while picking', err);
      }
    };

    const ifcOnRightClick = async (e?: React.MouseEvent<HTMLDivElement>) => {
      if (e) e.preventDefault();
      if (!viewer) return;
      try {
        // Ensure clipping mode is active before creating a plane
        if (viewer.clipper && !viewer.clipper.active) {
          viewer.clipper.active = true;
        }
        // Create a single clipping plane at the clicked position
        viewer.clipper.deleteAllPlanes();
        viewer.clipper.createPlane();
      } catch (err) {
        console.warn('Right-click clipping error', err);
      }
    };

    return (
      <>
        <div
          className={"ifcContainerViewer"}
          ref={ref}
          onDoubleClick={ifcOnDoubleClick}
          onContextMenu={ifcOnRightClick}
          onMouseMove={async () => {
            if (!viewer) return;
            try {
              const p: any = viewer.IFC.selector.prePickIfcItem();
              if (p && typeof p.then === "function") {
                const result = await p.catch(() => null);
                // If result exists, verify the model is still loaded
                if (result && result.modelID) {
                  const loadedModelIDs = new Set((props.loadedModels || []).map(m => m.modelID));
                  if (!loadedModelIDs.has(result.modelID)) {
                    // Model was unloaded, clear the hover highlight
                    viewer.IFC.selector.unpickIfcItems();
                  }
                }
              }
            } catch (err) {
              // swallow prePick errors to avoid unhandled promise rejections
              console.warn("prePickIfcItem error", err);
            }
          }}
          style={{
            position: "relative",
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
          }}
        />
        {/* Popover removed; properties now shown in the side PropertyPanel */}
      </>
    );
  }
);
