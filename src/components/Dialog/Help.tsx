import { GitHub } from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import React from "react";

export const HelpDialog: React.FC<{
  setIsDialogOpen: (open: boolean) => void;
  isDialogOpen: boolean;
}> = (props) => {
  return (
    <>
      <Dialog
        onClose={() => props.setIsDialogOpen(false)}
        open={props.isDialogOpen}
      >
        <DialogTitle>About</DialogTitle>
        <DialogContent>
          <List dense>
            <ListItem>
              <ListItemText primary="IFC Viewer" secondary="Version: 1.0" />
            </ListItem>
          </List>
          <GitHub />
        </DialogContent>
      </Dialog>
    </>
  );
};
