from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Tuple

from .models import Order, OrderStatus, Product, Schedule, ScheduleDraft, ScheduleItem, ScheduleStatus, WorkCenter
from .storage import load_state


class SchedulerConfig:
    def __init__(self, weights: Dict[str, int]):
        self.w1 = weights.get("w1", 3)
        self.w2 = weights.get("w2", 5)
        self.w3 = weights.get("w3", 1)
        self.w4 = weights.get("w4", 2)


def processing_time(order: Order, workcenter: WorkCenter) -> int:
    base = 30 + order.quantity // 5
    capacity_factor = max(workcenter.capacity_per_shift, 1)
    return max(int(base * (order.quantity / capacity_factor)), 1)


def setup_time(prev_key: str, next_key: str, setup_matrix: Dict[Tuple[str, str], int]) -> int:
    return setup_matrix.get((prev_key, next_key), 0)


def generate_proposal(
    orders: Iterable[Order],
    workcenters: Iterable[WorkCenter],
    setup_matrix: Dict[Tuple[str, str], int],
    schedule_base: Schedule,
    product_lookup: Dict[str, Product],
) -> ScheduleDraft:
    workcenter_list = list(workcenters)
    schedule_items: List[ScheduleItem] = []
    if not workcenter_list:
        return ScheduleDraft(schedule=schedule_base, items=schedule_items)
    grouped: Dict[str, List[Order]] = defaultdict(list)
    for order in orders:
        product = product_lookup.get(order.product_code)
        key = product.setup_key if product else order.product_code
        grouped[key].append(order)
    now = datetime.utcnow()
    for group_orders in grouped.values():
        group_orders.sort(key=lambda o: (o.due_date, processing_time(o, workcenter_list[0])))
    sequence_counter = 1
    for wc in workcenter_list:
        current_ts = now
        previous_key = None
        for setup_key, group_orders in grouped.items():
            for order in group_orders:
                duration = timedelta(minutes=processing_time(order, wc))
                setup_minutes = 0
                if previous_key:
                    setup_minutes = setup_time(previous_key, setup_key, setup_matrix)
                start_time = current_ts + timedelta(minutes=setup_minutes)
                end_time = start_time + duration
                item = ScheduleItem(
                    schedule_id=schedule_base.id,
                    workcenter_id=wc.id,
                    order_id=order.id,
                    start_ts=start_time,
                    end_ts=end_time,
                    sequence_no=sequence_counter,
                )
                schedule_items.append(item)
                sequence_counter += 1
                current_ts = end_time
                previous_key = setup_key
    return ScheduleDraft(schedule=schedule_base, items=schedule_items)


def run_scheduler(schedule_id: int, version: int, created_by: int) -> ScheduleDraft:
    state = load_state()
    weights = state["settings"].weights
    _ = SchedulerConfig(weights)
    open_orders = [o for o in state["orders"] if o.status != OrderStatus.done]
    workcenters = state["workcenters"]
    setup_matrix = {
        (row.from_key, row.to_key): row.setup_minutes for row in state["setup_matrix"]
    }
    product_lookup = {product.code: product for product in state["products"]}
    schedule = Schedule(
        id=schedule_id,
        version=version,
        status=ScheduleStatus.draft,
        created_at=datetime.utcnow(),
        created_by=created_by,
    )
    return generate_proposal(open_orders, workcenters, setup_matrix, schedule, product_lookup)
