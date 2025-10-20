from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class Role(str, Enum):
    admin = "admin"
    sales = "sales"
    planner = "planner"
    production = "production"


class OrderStatus(str, Enum):
    new = "new"
    scheduled = "scheduled"
    done = "done"


class ScheduleStatus(str, Enum):
    draft = "draft"
    published = "published"


class User(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Role
    password_hash: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: Role
    password: str


class Product(BaseModel):
    code: str
    name: str
    setup_key: str


class WorkCenter(BaseModel):
    id: int
    name: str
    capacity_per_shift: int = Field(..., ge=1)


class SetupMatrixRow(BaseModel):
    from_key: str
    to_key: str
    setup_minutes: int = Field(..., ge=0)


class Order(BaseModel):
    id: int
    product_code: str
    quantity: int
    due_date: datetime
    priority: int = Field(1, ge=1)
    is_rush: bool = False
    status: OrderStatus = OrderStatus.new
    created_at: datetime


class OrderCreate(BaseModel):
    product_code: str
    quantity: int
    due_date: datetime
    priority: int = Field(1, ge=1)
    is_rush: bool = False


class Schedule(BaseModel):
    id: int
    version: int
    status: ScheduleStatus
    created_at: datetime
    created_by: int


class ScheduleItem(BaseModel):
    schedule_id: int
    workcenter_id: int
    order_id: int
    start_ts: datetime
    end_ts: datetime
    sequence_no: int


class ScheduleDraft(BaseModel):
    schedule: Schedule
    items: List[ScheduleItem]


class KPI(BaseModel):
    total_lateness_min: int
    total_setup_min: int
    change_count: int
    avg_utilization: float


class Settings(BaseModel):
    weights: dict = Field(default_factory=lambda: {
        "w1": 3,
        "w2": 5,
        "w3": 1,
        "w4": 2,
    })
    counters: dict = Field(default_factory=dict)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    user_name: str


class ScheduleRunResponse(BaseModel):
    draft: ScheduleDraft
    kpi: KPI


class PublishRequest(BaseModel):
    schedule_id: int


class RollbackRequest(BaseModel):
    version: int


class WeightUpdate(BaseModel):
    w1: int
    w2: int
    w3: int
    w4: int


class SetupMatrixPayload(BaseModel):
    rows: List[SetupMatrixRow]


class LogEntry(BaseModel):
    timestamp: datetime
    actor: Optional[str]
    event: str
    payload: dict = Field(default_factory=dict)
