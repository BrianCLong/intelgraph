# Monthly Chaos Drill

## Objective

Validate RTO/RPO and system resilience by intentionally disrupting components.

## Workflow

1. Announce drill in #ops an hour prior.
2. Execute `kubectl delete pod -l app=graph-service` to simulate pod loss.
3. Terminate one Kafka broker to test message durability.
4. Verify automatic recovery and cross-region replica status.
5. Record findings and follow-up actions in this runbook.

## RTO/RPO Targets

- RTO: 15 minutes
- RPO: 5 minutes

## Verification

Use Grafana dashboard `Core SLOs` to monitor burn rates during the drill.
