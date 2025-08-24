# Telemetry Metrics Dictionary

| Name                | Purpose                                       | Type    | Calculation                                                   | Retention |
| ------------------- | --------------------------------------------- | ------- | ------------------------------------------------------------- | --------- |
| task_started        | count tasks initiated                         | counter | increment on `task_started` event                             | 30 days   |
| task_completed      | count tasks finished                          | counter | increment on `task_completed` event                           | 30 days   |
| error               | count task errors                             | counter | increment on `error` event                                    | 30 days   |
| abandon             | count tasks abandoned before completion       | counter | increment on `abandon` event                                  | 30 days   |
| decision_latency_ms | measure task decision latency in milliseconds | gauge   | average of `decision_latency_ms` from `task_completed` events | 30 days   |
