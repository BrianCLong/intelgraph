import React from "react";
import InfoOutlined from "@mui/icons-material/InfoOutlined";

export const PolicyChip: React.FC<{
  reason: string;
  onExplain: () => void;
}> = ({ reason, onExplain }) => (
  <button
    className="policy-chip"
    aria-label={`Policy: ${reason}`}
    onClick={onExplain}
    title={reason}
  >
    <InfoOutlined fontSize="small" /> Policy
  </button>
);
