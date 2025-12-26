import React from "react";
import { Box, Typography, Divider, Paper, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface PropertyItem {
  modelID: number;
  expressID: number;
  name?: string;
  type?: string;
  properties?: Record<string, any>;
}

interface PropertyPanelProps {
  items: PropertyItem[];
  loading?: boolean;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ items, loading = false }) => {
  if (loading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", textAlign: 'left' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'left' }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Select an IFC item to view properties
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, textAlign: 'left' }}>
      {items.map((item, idx) => (
        <Accordion key={`${item.modelID}-${item.expressID}`} defaultExpanded={items.length === 1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {item.name || `Model ${item.modelID} - ID ${item.expressID}`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ maxHeight: "400px", overflow: "auto" }}>
            <Box sx={{ width: "100%" }}>
              {item.type && (
                <>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, textAlign: 'left' }}>
                      Type
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>{item.type}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                </>
              )}

              {item.properties && Object.keys(item.properties).length > 0 ? (
                <Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                    {Object.entries(item.properties)
                      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                      .map(([key, value]) => (
                      <React.Fragment key={key}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          {key}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {formatValue(value)}
                        </Typography>
                      </React.Fragment>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No properties available
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    if (value.value !== undefined) return String(value.value);
    if (value.label !== undefined) return String(value.label);
    return JSON.stringify(value);
  }
  return String(value);
}

export default PropertyPanel;
