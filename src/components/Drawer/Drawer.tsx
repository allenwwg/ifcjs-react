import React, { useState } from "react";
import { styled, Theme, CSSObject } from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  CompareArrowsSharp,
  FolderOpenOutlined,
  HelpOutline,
  BugReport,
  Settings,
} from "@mui/icons-material";
import { IfcViewerAPI } from "web-ifc-viewer";

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
});

export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  minHeight: theme.spacing(6),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

export const DrawerContent: React.FC<{
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  viewer: IfcViewerAPI | undefined;
  ifcOnLoad: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  theme: Theme;
  setIsHelpDialogOpen: (open: boolean) => void;
  setIsConfirmationDialogOpen: (open: boolean) => void;
}> = (props) => {
  const [isClippingPaneSelected, setClippingPaneSelected] = useState(false);

  const toggleClippingPlanes = () => {
    const v: any = props.viewer as any;
    if (!v) return;
    try {
      if (typeof v.toggleClippingPlanes === 'function') {
        // Preferred API in web-ifc-viewer 1.0.210
        v.toggleClippingPlanes();
        const active = !!(v.clipper && v.clipper.active);
        setClippingPaneSelected(active);
      } else if (v.clipper) {
        // Fallback: toggle internal active flag without forcing a plane creation
        const nowActive = !v.clipper.active;
        v.clipper.active = nowActive;
        if (!nowActive) {
          // When turning off, clear planes
          if (typeof v.clipper.deleteAllPlanes === 'function') {
            v.clipper.deleteAllPlanes();
          }
        }
        setClippingPaneSelected(nowActive);
      }
    } catch (e) {
      console.warn('Clipping toggle error', e);
    }
  };

  // Sync selected state with the actual viewer clipper state on mount/update
  React.useEffect(() => {
    if (props.viewer && (props.viewer as any).clipper) {
      setClippingPaneSelected(!!(props.viewer as any).clipper.active);
    }
  }, [props.viewer]);

  return (
    <Drawer variant="permanent" open={props.isDrawerOpen}>
      <DrawerHeader>
        {props.isDrawerOpen ? (
          <IconButton onClick={() => props.setDrawerOpen(false)}>
            {props.theme.direction === "rtl" ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        ) : (
          <IconButton onClick={() => props.setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
        )}
      </DrawerHeader>
      <Divider />
      <List>
        <input
          type="file"
          accept=".ifc"
          id={"file-input"}
          onChange={props.ifcOnLoad}
          style={{ display: "none" }}
        />
        <label htmlFor="file-input">
          <ListItemButton key={"open File"}>
            <ListItemIcon>
              <FolderOpenOutlined />
            </ListItemIcon>
            <ListItemText primary={"Open File"} />
          </ListItemButton>
        </label>
        <ListItemButton
          key={"showPlane"}
          onClick={() => toggleClippingPlanes()}
          selected={isClippingPaneSelected}
        >
          <ListItemIcon>
            <CompareArrowsSharp />
          </ListItemIcon>
          <ListItemText primary={"Clipping Planes"} />
        </ListItemButton>
      </List>
      <Divider />
      <List>
        <ListItemButton
          key={"About"}
          onClick={() => props.setIsHelpDialogOpen(true)}
        >
          <ListItemIcon>
            <HelpOutline />
          </ListItemIcon>
          <ListItemText primary={"About"} />
        </ListItemButton>
      </List>
    </Drawer>
  );
};
