---
title: "ocpp1.6j-basics — OCPP 1.6j with OpenTelemetry"
tldr: OCPP 1.6j charging-point handshake instrumented end-to-end with OpenTelemetry, Jaeger, Tempo, Prometheus, and Grafana.
date_started: 2026-01-18
---

# ocpp1.6j-basics — OCPP 1.6j with OpenTelemetry

A minimal implementation of the OCPP 1.6j charging-point / central-system handshake (`BootNotification`, `Heartbeat`) instrumented end-to-end for trace and metric inspection.

## Stack

- **Protocol:** OCPP 1.6j (`BootNotification`, `Heartbeat` exchange between charge point and central system)
- **Instrumentation:** OpenTelemetry spans on protocol messages
- **Tracing:** Exporters configured for both Jaeger and Grafana Tempo
- **Metrics & Dashboards:** Prometheus scraping metrics from Jaeger and Tempo, visualized in Grafana

## Links

- Repository: [scaryPonens/ocpp1.6j-basics](https://github.com/scaryPonens/ocpp1.6j-basics)
- Build notes / conversation log: [ChatGPT thread](https://chatgpt.com/share/697e5f5e-b398-800b-8296-2262c2a2b8d2)
