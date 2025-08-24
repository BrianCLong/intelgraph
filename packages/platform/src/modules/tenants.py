from pydantic import BaseModel
from uuid import uuid4

class TenantCreate(BaseModel):
    name: str
    slug: str

class Tenant(BaseModel):
    id: str
    name: str
    slug: str

class TenantService:
    def __init__(self):
        self.tenants: dict[str, Tenant] = {}

    def create(self, payload: TenantCreate) -> Tenant:
        tenant = Tenant(id=str(uuid4()), **payload.dict())
        self.tenants[tenant.id] = tenant
        return tenant

    def get(self, tenant_id: str) -> Tenant | None:
        return self.tenants.get(tenant_id)
