import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Divider,
} from "@mui/material";
import React from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
// Remove buffer/pako by using native CompressionStream and base64 helpers

import { API_HOST } from "../../../env/Index";

const items = [
  { id: 0, name: "第21条第1号" },
  { id: 1, name: "第21条第2号" },
];

const CheckBuilding = async (ifcViewer: IfcViewerAPI | undefined) => {
  if (ifcViewer == undefined) {
    console.log("ifcViewer is undefined");
    return;
  }

  const data = await ifcViewer.IFC.loader.ifcManager.ifcAPI.ExportFileAsIFC(0);

  // 圧縮: Use CompressionStream('gzip') when available, else send raw
  async function gzipUint8(input) {
    if (typeof CompressionStream !== "undefined") {
      const cs = new CompressionStream("gzip");
      const readable = new Response(new Blob([input]).stream().pipeThrough(cs)).arrayBuffer();
      const buf = await readable;
      return new Uint8Array(buf);
    }
    // Fallback: return original data (no gzip)
    return input instanceof Uint8Array ? input : new Uint8Array(input);
  }

  function toBase64(u8) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk) as any);
    }
    return btoa(binary);
  }

  const gz = await gzipUint8(data);
  const valueBase64 = toBase64(gz);

  //  圧縮したvalueをAPIに投げる
  const response = await fetch(API_HOST + "/law/21-1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ifc: valueBase64,
      zipped: typeof CompressionStream !== "undefined",
      metadata: {
        name: "test",
        description: "test",
        author: "ktaroabobon",
      },
    }),
  });
  response.json().then((data) => {
    console.log("data", data);

    const blob = new Blob([JSON.stringify(data, null, " ")], {
      type: "application/json",
    });

    const link = document.createElement("a");
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = "confirmation.json";
    link.click();
    link.remove();
  });
};

export const ConfirmationDialog: React.FC<{
  setIsDialogOpen: (open: boolean) => void;
  isDialogOpen: boolean;
  ifcViewer: IfcViewerAPI | undefined;
}> = (props) => {
  const handleClose = () => {
    props.setIsDialogOpen(false);
  };

  const handleCheck = () => {
    handleClose();
    CheckBuilding(props.ifcViewer);
  };

  const ConfirmationForm = (
    <>
      <FormControl>
        {items.map((item) => (
          <FormControlLabel
            control={<Checkbox />}
            label={item.name}
            key={item.id}
          />
        ))}
      </FormControl>
    </>
  );

  return (
    <>
      <Dialog onClose={handleClose} open={props.isDialogOpen}>
        <DialogTitle>建築確認審査</DialogTitle>
        <DialogContent>{ConfirmationForm}</DialogContent>
        <Divider />
        <DialogActions>
          <Button color={"error"} onClick={handleClose}>
            キャンセル
          </Button>
          <Button color={"primary"} variant={"contained"} onClick={handleCheck}>
            確認開始
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
