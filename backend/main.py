from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from . import kpi, scheduler
from .models import (
    KPI,
    LoginRequest,
    Order,
    OrderCreate,
    OrderStatus,
    PublishRequest,
    RollbackRequest,
    Role,
    ScheduleDraft,
    ScheduleRunResponse,
    ScheduleStatus,
    SetupMatrixPayload,
    User,
    WeightUpdate,
)
from .security import (
    authenticate_user,
    create_access_token,
    get_current_user,
    require_roles,
    token_response,
)
from .storage import (
    append_event,
    ensure_files,
    load_draft,
    load_latest_schedule,
    load_state,
    log_order_created,
    log_schedule_run,
    next_id,
    publish_schedule,
    read_events,
    rollback_to,
    save_draft,
    save_orders,
    save_settings,
    save_setup_matrix,
)
from .websocket import manager

app = FastAPI(title="İnsan Onaylı Üretim Planlama")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    ensure_files()


@app.post("/auth/login")
def login(payload: LoginRequest):
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz kimlik bilgisi")
    token = create_access_token(user)
    append_event({"actor": user.id, "event": "login", "payload": {"email": user.email}})
    return token_response(user, token)


@app.post("/orders", response_model=Order, dependencies=[Depends(require_roles(Role.sales))])
def create_order(payload: OrderCreate, current_user: User = Depends(get_current_user)) -> Order:
    state = load_state()
    new_id, settings = next_id(state["settings"], "orders")
    order = Order(
        id=new_id,
        product_code=payload.product_code,
        quantity=payload.quantity,
        due_date=payload.due_date,
        priority=payload.priority,
        is_rush=payload.is_rush,
        status=OrderStatus.new,
        created_at=datetime.utcnow(),
    )
    orders = state["orders"] + [order]
    save_orders(orders)
    save_settings(settings)
    log_order_created(order, current_user.id)
    return order


@app.get("/orders", response_model=List[Order])
def list_orders(status: Optional[OrderStatus] = None, user: User = Depends(get_current_user)) -> List[Order]:
    state = load_state()
    orders = state["orders"]
    if status:
        orders = [order for order in orders if order.status == status]
    return orders


@app.post("/schedule/run", response_model=ScheduleRunResponse, dependencies=[Depends(require_roles(Role.planner))])
def run_schedule(current_user: User = Depends(get_current_user)) -> ScheduleRunResponse:
    state = load_state()
    schedule_id, settings = next_id(state["settings"], "schedule")
    version = schedule_id
    draft = scheduler.run_scheduler(schedule_id, version, current_user.id)
    save_draft(draft)
    save_settings(settings)
    log_schedule_run(draft, current_user.id)
    kpi_result = kpi.calculate_kpi(draft)
    return ScheduleRunResponse(draft=draft, kpi=kpi_result)


@app.post("/schedule/publish", dependencies=[Depends(require_roles(Role.planner))])
async def publish_schedule_endpoint(payload: PublishRequest, current_user: User = Depends(get_current_user)) -> ScheduleDraft:
    draft = load_draft()
    if not draft or draft.schedule.id != payload.schedule_id:
        raise HTTPException(status_code=404, detail="Taslak bulunamadı")
    draft.schedule.status = ScheduleStatus.published
    published = publish_schedule(draft)
    save_draft(draft)
    await manager.broadcast({"type": "plan_updated", "version": draft.schedule.version})
    append_event({"actor": current_user.id, "event": "email_mock", "payload": {"message": "Plan güncellendi"}})
    return published


@app.post("/schedule/rollback", dependencies=[Depends(require_roles(Role.planner, Role.admin))])
def rollback(payload: RollbackRequest, current_user: User = Depends(get_current_user)) -> ScheduleDraft:
    schedule = rollback_to(payload.version)
    if not schedule:
        raise HTTPException(status_code=404, detail="Versiyon bulunamadı")
    return schedule


@app.get("/schedule/current", response_model=ScheduleDraft)
def get_current_schedule(user: User = Depends(get_current_user)) -> ScheduleDraft:
    schedule = load_latest_schedule()
    if not schedule:
        raise HTTPException(status_code=404, detail="Yayınlı plan yok")
    return schedule


@app.get("/kpi/summary", response_model=KPI)
def get_kpi(scheduleId: int, user: User = Depends(get_current_user)) -> KPI:
    schedule = load_latest_schedule()
    if not schedule or schedule.schedule.id != scheduleId:
        raise HTTPException(status_code=404, detail="Schedule bulunamadı")
    return kpi.calculate_kpi(schedule)


@app.post("/settings/weights", dependencies=[Depends(require_roles(Role.admin))])
def update_weights(payload: WeightUpdate, user: User = Depends(get_current_user)) -> dict:
    state = load_state()
    settings = state["settings"]
    settings.weights = payload.dict()
    save_settings(settings)
    append_event({"actor": user.id, "event": "weights_updated", "payload": payload.dict()})
    return settings.weights


@app.post("/settings/setup-matrix", dependencies=[Depends(require_roles(Role.admin))])
def update_setup_matrix(payload: SetupMatrixPayload, user: User = Depends(get_current_user)) -> List[dict]:
    save_setup_matrix(payload.rows)
    append_event({"actor": user.id, "event": "setup_matrix_updated", "payload": {"rows": len(payload.rows)}})
    return [row.dict() for row in payload.rows]


@app.get("/settings/weights")
def get_weights(user: User = Depends(get_current_user)) -> dict:
    state = load_state()
    return state["settings"].weights


@app.get("/settings/setup-matrix")
def get_setup_matrix(user: User = Depends(get_current_user)) -> List[dict]:
    state = load_state()
    return [row.dict() for row in state["setup_matrix"]]


@app.get("/log")
def get_log(user: User = Depends(get_current_user)) -> List[dict]:
    return read_events(limit=200)


@app.websocket("/realtime")
async def realtime(websocket: WebSocket):
    connection_id = await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        pass
    finally:
        manager.disconnect(connection_id)
