import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import AdapterDateFns from "@mui/lab/AdapterDateFns";
import LocalizationProvider from "@mui/lab/LocalizationProvider";
import DatePicker from "@mui/lab/DatePicker";
import { apiFetch } from "../services/api";

interface EntityOption {
  id: string;
  label: string;
}

const tagOptions = ["Person", "Organization", "Location", "Event"];

function EntityFilterPanel() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number[]>([0, 1]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    const q = searchParams.get("entity");
    const tagsParam = searchParams.get("tags");
    const confParam = searchParams.get("confidence");
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    if (q) setQuery(q);
    if (tagsParam) setTags(tagsParam.split(",").filter(Boolean));
    if (confParam) {
      const [min, max] = confParam.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) setConfidence([min, max]);
    }
    if (startParam) setStartDate(new Date(startParam));
    if (endParam) setEndDate(new Date(endParam));
  }, []);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setEntityOptions([]);
      return undefined;
    }
    const controller = new AbortController();
    apiFetch(`/api/entities/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data)) setEntityOptions(data);
        else if (Array.isArray(data?.entities)) setEntityOptions(data.entities);
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("entity", query);
    if (tags.length) params.set("tags", tags.join(","));
    if (confidence[0] !== 0 || confidence[1] !== 1)
      params.set("confidence", `${confidence[0]}-${confidence[1]}`);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    setSearchParams(params, { replace: true });
  }, [query, tags, confidence, startDate, endDate]);

  const resultsLink = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("entity", query);
    if (tags.length) params.set("tags", tags.join(","));
    if (confidence[0] !== 0 || confidence[1] !== 1)
      params.set("confidence", `${confidence[0]}-${confidence[1]}`);
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());
    params.set("page", "1");
    return `/entities?${params.toString()}`;
  }, [query, tags, confidence, startDate, endDate]);

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Filter Entities
      </Typography>
      <Stack spacing={2}>
        <Autocomplete
          freeSolo
          options={entityOptions.map((o) => o.label)}
          inputValue={query}
          onInputChange={(_e, v) => setQuery(v)}
          renderInput={(params) => <TextField {...params} label="Entity" />}
        />
        <Autocomplete
          multiple
          options={tagOptions}
          value={tags}
          onChange={(_e, v) => setTags(v)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                variant="outlined"
                label={option}
                {...getTagProps({ index })}
              />
            ))
          }
          renderInput={(params) => <TextField {...params} label="Tags" />}
        />
        <Box>
          <Typography gutterBottom>Confidence Range</Typography>
          <Slider
            value={confidence}
            onChange={(_e, v) => setConfidence(v as number[])}
            valueLabelDisplay="auto"
            min={0}
            max={1}
            step={0.01}
          />
        </Box>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack direction="row" spacing={2}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(date) => setStartDate(date)}
              renderInput={(params) => <TextField {...params} />}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(date) => setEndDate(date)}
              renderInput={(params) => <TextField {...params} />}
            />
          </Stack>
        </LocalizationProvider>
        <Box>
          <Button variant="contained" component={RouterLink} to={resultsLink}>
            View Results
          </Button>
        </Box>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Pending Merge Decisions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review suggested merges in the entity drawer to finalize or skip.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default EntityFilterPanel;
