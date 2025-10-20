import json
import os
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from filelock import FileLock

from .models import (
    Order,
    Product,
    Schedule,
    ScheduleDraft,
    ScheduleItem,
    Settings,
    SetupMatrixRow,
    User,
    WorkCenter,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCHEDULE_DIR = DATA_DIR / "schedules"
EVENT_LOG = DATA_DIR / "events.ndjson"
WRITE_LOCK = DATA_DIR / ".write.lock"

DATA_FILES = {
    "users": DATA_DIR / "users.json",
    "products": DATA_DIR / "products.json",
    "workcenters": DATA_DIR / "workcenters.json",
    "setup_matrix": DATA_DIR / "setup_matrix.json",
    "orders": DATA_DIR / "orders.json",
    "settings": DATA_DIR / "settings.json",
}

DRAFT_FILE = SCHEDULE_DIR / "draft.json"
LATEST_FILE = SCHEDULE_DIR / "latest.json"


def ensure_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SCHEDULE_DIR.mkdir(parents=True, exist_ok=True)
    for name, path in DATA_FILES.items():
        if not path.exists():
            if name == "settings":
                path.write_text(json.dumps(Settings().dict(), ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                path.write_text("[]", encoding="utf-8")
    if not EVENT_LOG.exists():
        EVENT_LOG.write_text("", encoding="utf-8")
    if not DRAFT_FILE.exists():
        DRAFT_FILE.write_text(json.dumps({}), encoding="utf-8")
    if not LATEST_FILE.exists():
        LATEST_FILE.write_text(json.dumps({}), encoding="utf-8")


def read_json(path: Path) -> Any:
    if not path.exists():
        return None
    content = path.read_text(encoding="utf-8")
    if not content.strip():
        return None
    return json.loads(content)


def save_json_atomic(path: Path, obj: Any) -> None:
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as tmp:
        json.dump(obj, tmp, ensure_ascii=False, indent=2, default=str)
        tmp.flush()
        os.fsync(tmp.fileno())
    os.replace(tmp_path, path)


def write_json(path: Path, obj: Any) -> None:
    save_json_atomic(path, obj)


def load_state() -> Dict[str, Any]:
    ensure_files()
    users = [User(**u) for u in read_json(DATA_FILES["users"]) or []]
    products = [Product(**p) for p in read_json(DATA_FILES["products"]) or []]
    workcenters = [WorkCenter(**w) for w in read_json(DATA_FILES["workcenters"]) or []]
    setup_matrix = [SetupMatrixRow(**row) for row in read_json(DATA_FILES["setup_matrix"]) or []]
    orders = [Order(**o) for o in read_json(DATA_FILES["orders"]) or []]
    settings_data = read_json(DATA_FILES["settings"])
    settings = Settings(**settings_data) if settings_data else Settings()
    draft_data = read_json(DRAFT_FILE) or {}
    latest_data = read_json(LATEST_FILE) or {}
    return {
        "users": users,
        "products": products,
        "workcenters": workcenters,
        "setup_matrix": setup_matrix,
        "orders": orders,
        "settings": settings,
        "draft": draft_data,
        "latest": latest_data,
    }


@contextmanager
def with_write_lock():
    ensure_files()
    lock = FileLock(str(WRITE_LOCK))
    with lock:
        yield


def append_event(event: Dict[str, Any]) -> None:
    ensure_files()
    event_record = {**event, "timestamp": datetime.utcnow().isoformat()}
    with EVENT_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event_record, ensure_ascii=False) + "\n")


def read_events(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    ensure_files()
    events: List[Dict[str, Any]] = []
    with EVENT_LOG.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                events.append(json.loads(line))
    if limit is not None:
        events = events[-limit:]
    return events


def save_orders(orders: Iterable[Order]) -> None:
    write_json(DATA_FILES["orders"], [o.dict() for o in orders])


def save_users(users: Iterable[User]) -> None:
    write_json(DATA_FILES["users"], [u.dict() for u in users])


def save_settings(settings: Settings) -> None:
    write_json(DATA_FILES["settings"], settings.dict())


def save_setup_matrix(rows: Iterable[SetupMatrixRow]) -> None:
    write_json(DATA_FILES["setup_matrix"], [r.dict() for r in rows])


def save_workcenters(workcenters: Iterable[WorkCenter]) -> None:
    write_json(DATA_FILES["workcenters"], [w.dict() for w in workcenters])


def save_products(products: Iterable[Product]) -> None:
    write_json(DATA_FILES["products"], [p.dict() for p in products])


def save_draft(draft: ScheduleDraft) -> None:
    write_json(DRAFT_FILE, draft.dict())


def load_draft() -> Optional[ScheduleDraft]:
    data = read_json(DRAFT_FILE)
    if not data:
        return None
    return ScheduleDraft(
        schedule=Schedule(**data["schedule"]),
        items=[ScheduleItem(**item) for item in data.get("items", [])],
    )


def load_latest_schedule() -> Optional[ScheduleDraft]:
    data = read_json(LATEST_FILE)
    if not data:
        return None
    return ScheduleDraft(
        schedule=Schedule(**data["schedule"]),
        items=[ScheduleItem(**item) for item in data.get("items", [])],
    )


def next_id(settings: Settings, seq_name: str) -> Tuple[int, Settings]:
    counters = dict(settings.counters)
    counters.setdefault(seq_name, 0)
    counters[seq_name] += 1
    settings.counters = counters
    return counters[seq_name], settings


def publish_schedule(draft: ScheduleDraft) -> ScheduleDraft:
    ensure_files()
    version = draft.schedule.version
    schedule_path = SCHEDULE_DIR / f"schedule_{version}.json"
    write_json(schedule_path, draft.dict())
    write_json(LATEST_FILE, draft.dict())
    append_event(
        {
            "actor": draft.schedule.created_by,
            "event": "schedule_published",
            "payload": {"version": version, "schedule_id": draft.schedule.id},
        }
    )
    return draft


def rollback_to(version: int) -> Optional[ScheduleDraft]:
    target_path = SCHEDULE_DIR / f"schedule_{version}.json"
    if not target_path.exists():
        return None
    data = read_json(target_path)
    if not data:
        return None
    write_json(LATEST_FILE, data)
    append_event(
        {
            "actor": None,
            "event": "schedule_rollback",
            "payload": {"version": version},
        }
    )
    return ScheduleDraft(
        schedule=Schedule(**data["schedule"]),
        items=[ScheduleItem(**item) for item in data.get("items", [])],
    )


def log_order_created(order: Order, actor: int) -> None:
    append_event(
        {
            "actor": actor,
            "event": "order_created",
            "payload": {
                "order_id": order.id,
                "product_code": order.product_code,
                "quantity": order.quantity,
            },
        }
    )


def log_schedule_run(schedule: ScheduleDraft, actor: int) -> None:
    append_event(
        {
            "actor": actor,
            "event": "schedule_generated",
            "payload": {
                "schedule_id": schedule.schedule.id,
                "version": schedule.schedule.version,
                "item_count": len(schedule.items),
            },
        }
    )
