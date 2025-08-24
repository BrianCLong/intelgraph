package intelgraph.combined

import data.intelgraph.authz
import data.tenant

test_global_deny {
  not allow with input as {"tenant":"default","user":{"role":"guest"},"field":"investigations"}
}

test_tenant_extra_allow {
  allow with input as {"tenant":"acme","user":{"role":"viewer"},"field":"investigations"}
}
