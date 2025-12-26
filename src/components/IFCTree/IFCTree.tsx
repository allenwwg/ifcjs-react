import React from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Box, IconButton, Typography, CircularProgress, Dialog, DialogTitle, DialogActions, Button } from "@mui/material";
// Use MUI X package exports: SimpleTreeView (alias as TreeView) + TreeItem
import { SimpleTreeView, TreeItem } from "@mui/x-tree-view";
const TreeViewComp: any = SimpleTreeView as any;
const TreeItemComp: any = TreeItem as any;
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

interface IFCTreeProps {
  viewer?: IfcViewerAPI;
  models: Array<any>;
  onUnloadModel: (modelID: number) => void;
  onNodeSelect?: (selections: Array<{ modelID: number; expressID: number }>) => void;
}

export const IFCTree: React.FC<IFCTreeProps> = ({ viewer, models, onUnloadModel, onNodeSelect }) => {
  const [trees, setTrees] = React.useState<Record<number, any[]>>({});
  const [loadingModels, setLoadingModels] = React.useState<Set<number>>(new Set());
  const [selectedNodes, setSelectedNodes] = React.useState<Set<string>>(new Set());
  const [expandedNodes, setExpandedNodes] = React.useState<Record<number, Set<string>>>({});
  const [confirmUnload, setConfirmUnload] = React.useState<number | null>(null);
  const nodeIdMap = React.useRef(new WeakMap<any, string>());
  const genId = React.useRef(0);

  React.useEffect(() => {
    let mounted = true;
    async function fetchTrees() {
      if (!viewer) return;
      const newTrees: Record<number, any[]> = {};
      const currentModelIDs = new Set(models.map(m => m.modelID));
      
      // Clear selections and tree data for models that are no longer in the list
      setSelectedNodes((prev) => {
        const next = new Set<string>();
        let hasRemoved = false;
        prev.forEach((nodeId) => {
          const [modelIDStr] = nodeId.split("-");
          const modelID = Number(modelIDStr);
          if (currentModelIDs.has(modelID)) {
            next.add(nodeId);
          } else {
            hasRemoved = true;
          }
        });
        // If selections were removed, notify parent to clear highlights
        if (hasRemoved && onNodeSelect) {
          const remainingSelections = Array.from(next).map((id) => {
            const [mID, expID] = id.split("-");
            return { modelID: Number(mID), expressID: Number(expID) };
          });
          onNodeSelect(remainingSelections);
        }
        return next;
      });
      
      // Clear tree data for removed models
      setTrees((prev) => {
        const next: Record<number, any[]> = {};
        Object.keys(prev).forEach((key) => {
          const modelID = Number(key);
          if (currentModelIDs.has(modelID)) {
            next[modelID] = prev[modelID];
          }
        });
        return next;
      });
      
      // Clear expanded nodes for removed models
      setExpandedNodes((prev) => {
        const next: Record<number, Set<string>> = {};
        Object.keys(prev).forEach((key) => {
          const modelID = Number(key);
          if (currentModelIDs.has(modelID)) {
            next[modelID] = prev[modelID];
          }
        });
        return next;
      });
      
      // Get current trees state to check what we already have
      setTrees((prevTrees) => {
        const updatedTrees: Record<number, any[]> = {};
        
        for (const m of models) {
          const modelID = m?.modelID;
          if (modelID === undefined) continue;
          
          // Keep existing tree data if available
          if (prevTrees[modelID]) {
            updatedTrees[modelID] = prevTrees[modelID];
          }
        }
        
        // Fetch trees for new models
        (async () => {
          for (const m of models) {
            const modelID = m?.modelID;
            if (modelID === undefined) continue;
            
            // Only fetch if we don't already have the tree
            if (!updatedTrees[modelID]) {
              try {
                setLoadingModels((prev) => new Set(prev).add(modelID));
                const tree = await viewer.IFC.getSpatialStructure(modelID);
                if (mounted) {
                  setTrees((current) => ({
                    ...current,
                    [modelID]: Array.isArray(tree) ? tree : [tree],
                  }));
                }
              } catch (e) {
                console.error(`Error loading tree for model ${modelID}:`, e);
                if (mounted) {
                  setTrees((current) => ({
                    ...current,
                    [modelID]: [],
                  }));
                }
              } finally {
                setLoadingModels((prev) => {
                  const next = new Set(prev);
                  next.delete(modelID);
                  return next;
                });
              }
            }
          }
        })();
        
        return updatedTrees;
      });
    }
    fetchTrees();
    return () => { mounted = false; };
  }, [viewer, models]);

  function collectDescendantIds(node: any, modelID: number): string[] {
    const result: string[] = [];
    
    function traverse(n: any) {
      if (!n) return;
      
      // Add current node
      const expID = resolveNodeId(modelID, n);
      result.push(`${modelID}-${expID}`);
      
      // Traverse children
      if (n.children && Array.isArray(n.children)) {
        n.children.forEach((child: any) => traverse(child));
      }
    }
    
    traverse(node);
    return result;
  }

  const handleNodeSelect = (modelID: number, expressIDRaw: string | number, ctrlKey: boolean, node: any) => {
    const expressIDStr = String(expressIDRaw);
    const nodeId = `${modelID}-${expressIDStr}`;
    
    // Collect all descendant IDs (including the node itself)
    const allDescendants = collectDescendantIds(node, modelID);
    
    // Check if all descendants are already selected
    const allSelected = allDescendants.every(id => selectedNodes.has(id));
    
    let newSelected: Set<string>;
    if (ctrlKey) {
      // Ctrl+Click: toggle selection of all descendants
      newSelected = new Set(selectedNodes);
      if (allSelected) {
        // Remove all descendants
        allDescendants.forEach(id => newSelected.delete(id));
      } else {
        // Add all descendants
        allDescendants.forEach(id => newSelected.add(id));
      }
    } else {
      // Single click: toggle or select
      if (allSelected) {
        // All descendants already selected, so deselect them
        newSelected = new Set(selectedNodes);
        allDescendants.forEach(id => newSelected.delete(id));
      } else {
        // Not all selected, so select all descendants
        newSelected = new Set(allDescendants);
      }
    }
    
    setSelectedNodes(newSelected);
    
    // Build selection array for callback
    if (onNodeSelect) {
      const selections = Array.from(newSelected).map((id) => {
        const [mID, expID] = id.split("-");
        return { modelID: Number(mID), expressID: Number(expID) };
      });
      onNodeSelect(selections);
    }
  };

  const handleUnloadClick = (modelID: number) => {
    setConfirmUnload(modelID);
  };

  const confirmDelete = () => {
    if (confirmUnload !== null) {
      onUnloadModel(confirmUnload);
    }
    setConfirmUnload(null);
  };

  function resolveNodeId(modelID: number, node: any) {
    if (!node) return `gen-${modelID}-${genId.current++}`;
    if (node.expressID != null) return String(node.expressID);
    if (node.id != null) return String(node.id);
    if (node.GlobalId && node.GlobalId.value) return String(node.GlobalId.value);
    if (nodeIdMap.current.has(node)) return nodeIdMap.current.get(node)!;
    const gid = `gen-${genId.current++}`;
    nodeIdMap.current.set(node, gid);
    return gid;
  }

  function renderNode(modelID: number, node: any): React.ReactNode {
    const expressID = resolveNodeId(modelID, node);
    const nodeId = `${modelID}-${expressID}`;
    const label = (node && (node.name ?? node.type)) ?? `#${expressID}`;
    const isSelected = selectedNodes.has(nodeId);

    return (
      <TreeItemComp
        key={nodeId}
        itemId={nodeId}
        label={
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleNodeSelect(modelID, expressID, e.ctrlKey || e.metaKey, node);
            }}
            style={{
              backgroundColor: isSelected ? "#1976d2" : "transparent",
              color: isSelected ? "white" : "inherit",
              borderRadius: 4,
              padding: "4px 8px",
              cursor: "pointer",
              fontWeight: isSelected ? 600 : 400,
              transition: "all 0.2s ease",
              display: "inline-block",
              minWidth: "100%",
            }}
          >
            {label}
          </span>
        }
        sx={{
          "& .MuiTreeItem-content": {
            borderLeft: isSelected ? "3px solid #1976d2" : "3px solid transparent",
            borderRadius: 1,
            transition: "all 0.2s ease",
          },
          "& .MuiTreeItem-label": {
            padding: isSelected ? "4px 8px" : "2px 4px",
            backgroundColor: isSelected ? "rgba(25, 118, 210, 0.08)" : "transparent",
            borderRadius: 1,
          },
        }}
      >
        {node && node.children && node.children.map((c: any, idx: number) => (
          renderNode(modelID, c)
        ))}
      </TreeItemComp>
    );
  }

  return (
    <Box sx={{ width: 320, maxHeight: "80vh", overflow: "auto", p: 1, bgcolor: "background.paper" }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
        IFC Models
      </Typography>
      {models.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No models loaded
        </Typography>
      )}
      {models.map((m) => (
        <Box key={m.modelID} sx={{ mb: 2, borderBottom: "1px solid rgba(0,0,0,0.08)", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
              {m.name ?? `Model ${m.modelID}`}
            </Typography>
            {loadingModels.has(m.modelID) ? (
              <CircularProgress size={20} />
            ) : (
              <IconButton
                size="small"
                onClick={() => handleUnloadClick(m.modelID)}
                aria-label={`unload-${m.modelID}`}
                sx={{ color: "error.main" }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          {loadingModels.has(m.modelID) ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, pl: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption">Loading structure...</Typography>
            </Box>
          ) : (
            <TreeViewComp
              slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
              expandedItems={Array.from(expandedNodes[m.modelID] || new Set())}
              onExpandedItemsChange={(event: any, itemIds: string[]) => {
                setExpandedNodes((prev) => ({
                  ...prev,
                  [m.modelID]: new Set(itemIds),
                }));
              }}
              sx={{ mt: 1 }}
            >
              {trees[m.modelID] && trees[m.modelID].map((n: any) => renderNode(m.modelID, n))}
            </TreeViewComp>
          )}
        </Box>
      ))}

      <Dialog open={confirmUnload !== null} onClose={() => setConfirmUnload(null)}>
        <DialogTitle>Confirm Unload</DialogTitle>
        <Box sx={{ p: 2 }}>
          <Typography>
            Are you sure you want to unload model {confirmUnload}?
          </Typography>
        </Box>
        <DialogActions>
          <Button onClick={() => setConfirmUnload(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Unload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IFCTree;
