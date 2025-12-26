import React, { createRef, useEffect, useState } from "react";
import {
  Backdrop,
  Box,
  CircularProgress,
  CssBaseline,
  useTheme,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";
import { IfcContainer } from "../components/IFCContainer/IfcContainer";
import { IFCTree } from "../components/IFCTree/IFCTree";
import { PropertyPanel } from "../components/PropertyPanel/PropertyPanel";
import { IfcViewerAPI } from "web-ifc-viewer";
import { DrawerContent, DrawerHeader } from "../components/Drawer/Drawer";
import { HelpDialog } from "../components/Dialog/Help";
import { SnackbarContent } from "../components/Snackbar/Snackbar";
import { ConfirmationDialog } from "../components/Dialog/Confirmation";

export const Index: React.FC = () => {
  const theme = useTheme();

  const [loading, setLoading] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [selectedProperties, setSelectedProperties] = useState<Array<any>>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  const ifcContainerRef = createRef<HTMLDivElement>();
  const [ifcViewer, setIfcViewer] = useState<IfcViewerAPI>();
  const [modelsList, setModelsList] = useState<Array<any>>([]);
  const [ifcLoadingErrorMessage, setIfcLoadingErrorMessage] =
    useState<string>();

  useEffect(() => {
    if (ifcContainerRef.current) {
      const container = ifcContainerRef.current;
      console.log("container", container);
      const ifcViewer = new IfcViewerAPI({
        container,
      });
      console.log("ifcViewer", ifcViewer);
      ifcViewer.axes.setAxes();
      ifcViewer.grid.setGrid();
      // Expose viewer for debugging in console
      (window as any).viewer = ifcViewer;
      ifcViewer.IFC.loader.ifcManager.applyWebIfcConfig({
        COORDINATE_TO_ORIGIN: true,
        USE_FAST_BOOLS: false,
      });
      setIfcViewer(ifcViewer);
      console.log("set ifcViewer", ifcViewer);
    }
  }, []);

  const ifcOnLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e && e.target && e.target.files && e.target.files[0];
    if (file && ifcViewer) {
      setIfcLoadingErrorMessage("");
      setLoading(true);
      console.log("loading file");

      try {
        const model = await ifcViewer.IFC.loadIfc(file, true, ifcOnLoadError);
        console.log("build model");
        await ifcViewer.shadowDropper.renderShadow(model.modelID);
        console.log("render shadow");

        // track loaded model for the UI tree
        setModelsList((prev) => [...prev, { modelID: model.modelID, name: file.name }]);

        setIsSnackbarOpen(true);
        setLoading(false);
        console.log("done");
        console.log(ifcViewer);
      } catch (error) {
        console.error("Error loading IFC file:", error);
        setIfcLoadingErrorMessage(error instanceof Error ? error.message : "Failed to load IFC file");
        setIsSnackbarOpen(true);
        setLoading(false);
      } finally {
        // Reset file input so the same file can be selected again
        if (e.target) {
          e.target.value = '';
        }
      }
    }
  };

  // Helper function to dispose of all resources from a Three.js object
  const disposeObject = (object: any) => {
    if (!object) return;
    
    // Dispose geometry
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    // Dispose materials and textures
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat: any) => {
          if (mat) {
            // Dispose textures
            if (mat.map) mat.map.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            if (mat.roughnessMap) mat.roughnessMap.dispose();
            if (mat.metalnessMap) mat.metalnessMap.dispose();
            if (mat.aoMap) mat.aoMap.dispose();
            if (mat.emissiveMap) mat.emissiveMap.dispose();
            if (mat.bumpMap) mat.bumpMap.dispose();
            if (mat.displacementMap) mat.displacementMap.dispose();
            if (mat.envMap) mat.envMap.dispose();
            // Dispose material
            mat.dispose();
          }
        });
      } else {
        // Dispose textures
        if (object.material.map) object.material.map.dispose();
        if (object.material.normalMap) object.material.normalMap.dispose();
        if (object.material.roughnessMap) object.material.roughnessMap.dispose();
        if (object.material.metalnessMap) object.material.metalnessMap.dispose();
        if (object.material.aoMap) object.material.aoMap.dispose();
        if (object.material.emissiveMap) object.material.emissiveMap.dispose();
        if (object.material.bumpMap) object.material.bumpMap.dispose();
        if (object.material.displacementMap) object.material.displacementMap.dispose();
        if (object.material.envMap) object.material.envMap.dispose();
        // Dispose material
        object.material.dispose();
      }
    }
    
    // Recursively dispose children
    if (object.children && Array.isArray(object.children)) {
      object.children.forEach((child: any) => disposeObject(child));
    }
  };

  const unloadModel = async (modelID: number) => {
    if (!ifcViewer) return;
    try {
      // Clear all selections and highlights first
      ifcViewer.IFC.selector.unpickIfcItems();
      
      // Clear properties if they belong to the unloaded model
      setSelectedProperties((prev) => {
        const filtered = prev.filter((p) => p.modelID !== modelID);
        return filtered;
      });
      
      // Clear selection callback to ensure no residual selections
      handleNodeSelect([]);
      
      const anyViewer: any = ifcViewer;
      
      // Get the model before unloading
      const models = anyViewer.context?.items?.ifcModels || [];
      const model = models.find((x: any) => x.modelID === modelID);
      
      // Clear shadows for this model
      try {
        if (anyViewer.shadowDropper) {
          if (typeof anyViewer.shadowDropper.deleteShadow === "function") {
            anyViewer.shadowDropper.deleteShadow(modelID);
          } else if (typeof anyViewer.shadowDropper.removeShadow === "function") {
            anyViewer.shadowDropper.removeShadow(modelID);
          } else if (anyViewer.shadowDropper.shadows) {
            const shadowMeshes = anyViewer.context?.scene?.children?.filter((child: any) => 
              child.userData?.modelID === modelID && child.userData?.isShadow
            ) || [];
            shadowMeshes.forEach((shadow: any) => {
              anyViewer.context.scene.remove(shadow);
              disposeObject(shadow);
            });
          }
        }
      } catch (shadowError) {
        console.warn("Error clearing shadows:", shadowError);
      }
      
      // Use viewer's built-in unload method first (most reliable)
      if (anyViewer.IFC && typeof anyViewer.IFC.unloadModel === "function") {
        await anyViewer.IFC.unloadModel(modelID);
      } else if (anyViewer.IFC?.loader?.ifcManager && typeof anyViewer.IFC.loader.ifcManager.unloadModel === "function") {
        await anyViewer.IFC.loader.ifcManager.unloadModel(modelID);
      } else if (typeof anyViewer.removeModel === "function") {
        await anyViewer.removeModel(modelID);
      }
      
      // Additional cleanup: dispose of model mesh and all its resources
      if (model && model.mesh) {
        // Remove from scene
        if (anyViewer.context?.scene) {
          anyViewer.context.scene.remove(model.mesh);
        }
        
        // Dispose all resources recursively
        disposeObject(model.mesh);
      }
      
      // Clear IFC manager's cache for this model
      try {
        if (anyViewer.IFC?.loader?.ifcManager) {
          const ifcManager = anyViewer.IFC.loader.ifcManager;
          // Clear model cache
          if (ifcManager.state?.models && ifcManager.state.models[modelID]) {
            delete ifcManager.state.models[modelID];
          }
          // Clear express ID cache
          if (ifcManager.state?.expressIDCache && ifcManager.state.expressIDCache[modelID]) {
            delete ifcManager.state.expressIDCache[modelID];
          }
          // Clear type map
          if (ifcManager.state?.typeMap && ifcManager.state.typeMap[modelID]) {
            delete ifcManager.state.typeMap[modelID];
          }
        }
      } catch (cacheError) {
        console.warn("Error clearing IFC cache:", cacheError);
      }
      
      // Clean up any clipping planes associated with this model
      try {
        if (anyViewer.clipper && anyViewer.clipper.planes) {
          // Remove clipping planes that reference this model
          const planesToRemove: any[] = [];
          anyViewer.clipper.planes.forEach((plane: any, index: number) => {
            if (plane.userData?.modelID === modelID || 
                (plane.origin && plane.origin.userData?.modelID === modelID)) {
              planesToRemove.push(index);
            }
          });
          // Remove planes in reverse order to maintain indices
          planesToRemove.reverse().forEach((index: number) => {
            try {
              anyViewer.clipper.deletePlane(index);
            } catch (e) {
              console.warn("Error removing clipping plane:", e);
            }
          });
        }
      } catch (clipError) {
        console.warn("Error clearing clipping planes:", clipError);
      }
      
      // Clean up any other scene objects associated with this model
      try {
        if (anyViewer.context?.scene) {
          const objectsToRemove: any[] = [];
          anyViewer.context.scene.traverse((object: any) => {
            if (object.userData?.modelID === modelID && object !== model?.mesh) {
              objectsToRemove.push(object);
            }
          });
          objectsToRemove.forEach((obj: any) => {
            try {
              // Remove from parent
              if (obj.parent) {
                obj.parent.remove(obj);
              }
              // Dispose of all resources recursively
              disposeObject(obj);
            } catch (e) {
              console.warn("Error removing scene object:", e);
            }
          });
        }
      } catch (sceneError) {
        console.warn("Error cleaning up scene objects:", sceneError);
      }
      
      // Force garbage collection hint (browser may or may not honor this)
      if (anyViewer.context?.renderer) {
        // Clear renderer's internal caches if possible
        const renderer = anyViewer.context.renderer;
        if (renderer.info) {
          renderer.info.reset();
        }
      }
      
      // Final cleanup: ensure no highlights or hover effects remain
      ifcViewer.IFC.selector.unpickIfcItems();
      // Clear any pre-pick hover state
      try {
        const anyViewer: any = ifcViewer;
        if (anyViewer.IFC?.selector?.prePickIfcItem) {
          // Force clear by calling unpick again
          ifcViewer.IFC.selector.unpickIfcItems();
        }
      } catch (e) {
        // Ignore errors in cleanup
      }
    } catch (e) {
      console.error("unload model error", e);
    }
    setModelsList((prev) => prev.filter((m) => m.modelID !== modelID));
  };

  const ifcOnLoadError = async (err: React.ChangeEvent<HTMLInputElement>) => {
    setIfcLoadingErrorMessage(err.toString());
  };

  const handleNodeSelect = async (selections: Array<{ modelID: number; expressID: number }>) => {
    if (!ifcViewer) return;
    try {
      // Ensure side panel is visible when a selection happens
      if (selections && selections.length > 0 && !isPanelVisible) {
        setIsPanelVisible(true);
      }
      // If no selections, unhighlight everything
      if (selections.length === 0) {
        console.log("Clearing selection - unhighlighting all items");
        ifcViewer.IFC.selector.unpickIfcItems();
        setSelectedProperties([]);
        return;
      }

      // Group selections by modelID
      const byModel = new Map<number, number[]>();
      selections.forEach(({ modelID, expressID }) => {
        if (!byModel.has(modelID)) byModel.set(modelID, []);
        byModel.get(modelID)!.push(expressID);
      });

      // Start highlighting immediately (don't wait for properties)
      for (const [modelID, ids] of byModel.entries()) {
        console.log(`Highlighting model ${modelID}, items:`, ids);
        ifcViewer.IFC.selector.pickIfcItemsByID(modelID, ids, true, true).catch(() => {});
      }

      // If multiple selections, do not show properties panel per request
      if (selections.length > 1) {
        setSelectedProperties([]);
        return;
      }

      // Fetch properties only for single selection to speed up
      if (selections.length === 1) {
        setPropertiesLoading(true);
        const { modelID, expressID } = selections[0];
        try {
          let props: any = null;
          try {
            props = await ifcViewer.IFC.getProperties(modelID, expressID, false);
          } catch (e1) {
            console.warn(`getProperties failed for ${modelID}-${expressID}`, e1);
          }

          // Fallback: try manager API if available
          if (!props && (ifcViewer as any)?.IFC?.loader?.ifcManager) {
            const mgr: any = (ifcViewer as any).IFC.loader.ifcManager;
            try {
              if (typeof mgr.getItemProperties === 'function') {
                props = await mgr.getItemProperties(modelID, expressID, true);
              }
            } catch (e2) {
              console.warn(`manager.getItemProperties failed for ${modelID}-${expressID}`, e2);
            }
          }

          const type = ifcViewer.IFC.loader.ifcManager.getIfcType(modelID, expressID);
          const name = props?.Name?.value || props?.GlobalId?.value || `Item #${expressID}`;

          setSelectedProperties([
            {
              modelID,
              expressID,
              name,
              type,
              properties: props || {},
            },
          ]);
        } catch (e) {
          console.warn(`Failed to build properties for ${modelID}-${expressID}`, e);
          // Show minimal info even on failure
          const type = ifcViewer.IFC.loader.ifcManager.getIfcType(modelID, expressID);
          setSelectedProperties([
            {
              modelID,
              expressID,
              name: `Item #${expressID}`,
              type,
              properties: {},
            },
          ]);
        } finally {
          setPropertiesLoading(false);
        }
      } else {
        // no properties for multi-selection (already handled above), ensure cleared
        setSelectedProperties([]);
      }

    } catch (e) {
      console.error("node select error", e);
      setPropertiesLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <DrawerContent
          isDrawerOpen={isDrawerOpen}
          setDrawerOpen={setIsDrawerOpen}
          theme={theme}
          viewer={ifcViewer}
          ifcOnLoad={ifcOnLoad}
          setIsHelpDialogOpen={setIsHelpDialogOpen}
          setIsConfirmationDialogOpen={setIsConfirmationDialogOpen}
        />
        <Box component={"main"} sx={{ flexGrow: 1 }}>
          <IfcContainer
            ref={ifcContainerRef}
            viewer={ifcViewer}
            loadedModels={modelsList}
            onNodeSelect={handleNodeSelect}
          />
        </Box>
      </Box>

      {ifcViewer && isPanelVisible && (
        <Box
          sx={{
            position: 'fixed',
            right: 12,
            top: 12,
            bottom: 12,
            zIndex: 1300,
            bgcolor: 'background.paper',
            boxShadow: 1,
            borderRadius: 1,
            width: 360,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Tree pane (top) */}
          <Box id="pane-tree" sx={{ height: '60%', minHeight: 120, overflow: 'auto', position: 'relative' }}>
            <Tooltip title="Hide panel">
              <IconButton
                size="small"
                onClick={() => setIsPanelVisible(false)}
                sx={{ position: 'absolute', right: 4, top: 4, zIndex: 10, bgcolor: 'background.paper' }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IFCTree viewer={ifcViewer} models={modelsList} onUnloadModel={unloadModel} onNodeSelect={handleNodeSelect} />
          </Box>

          {/* Horizontal splitter */}
          <Box
            sx={{ height: 8, cursor: 'row-resize', bgcolor: 'divider' }}
            onMouseDown={(e) => {
              const container = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
              if (!container) return;
              const rect = container.getBoundingClientRect();
              const startY = e.clientY;
              const startTopHeight = (document.getElementById('pane-tree') as HTMLElement).getBoundingClientRect().height;

              function onMove(ev: MouseEvent) {
                const dy = ev.clientY - startY;
                const newTop = Math.max(80, Math.min(rect.height - 80, startTopHeight + dy));
                const topPct = newTop / rect.height;
                const treePane = document.getElementById('pane-tree') as HTMLElement;
                const propPane = document.getElementById('pane-prop') as HTMLElement;
                if (treePane && propPane) {
                  treePane.style.height = `${topPct * 100}%`;
                  propPane.style.height = `${(1 - topPct) * 100}%`;
                }
              }

              function onUp() {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              }

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />

          {/* Property pane (bottom) */}
          <Box id="pane-prop" sx={{ height: '40%', minHeight: 120, overflow: 'auto', position: 'relative' }}>
            <PropertyPanel items={selectedProperties} loading={propertiesLoading} />
          </Box>
        </Box>
      )}

      {/* Toggle button when panel is hidden */}
      {ifcViewer && !isPanelVisible && (
        <Tooltip title="Show panel" placement="left">
          <IconButton
            onClick={() => setIsPanelVisible(true)}
            sx={{
              position: 'fixed',
              right: 12,
              top: 12,
              zIndex: 1300,
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
      )}

      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress />
      </Backdrop>

      <ConfirmationDialog
        setIsDialogOpen={setIsConfirmationDialogOpen}
        isDialogOpen={isConfirmationDialogOpen}
        ifcViewer={ifcViewer}
      />
      <HelpDialog
        setIsDialogOpen={setIsHelpDialogOpen}
        isDialogOpen={isHelpDialogOpen}
      />

      <SnackbarContent
        isSnackbarOpen={isSnackbarOpen}
        setIsSnackbarOpen={setIsSnackbarOpen}
        ifcLoadingErrorMessage={ifcLoadingErrorMessage}
      />
    </>
  );
};
