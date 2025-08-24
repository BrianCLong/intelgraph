# Hotspot Computation

This document describes the hotspot scoring algorithm used by the Geo service.

## Overview

The service aggregates geospatial points into H3 hexagonal cells and applies an
exponential time-decay to emphasize recent activity. Clients can supply arbitrary
points and a target H3 resolution. The result is a list of cells ordered by
score, suitable for heat map rendering.
