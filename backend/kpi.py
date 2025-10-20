from collections import defaultdict

from .models import KPI, ScheduleDraft
from .storage import load_state


def calculate_kpi(schedule: ScheduleDraft) -> KPI:
    state = load_state()
    order_lookup = {order.id: order for order in state["orders"]}
    product_lookup = {product.code: product for product in state["products"]}
    setup_matrix = {
        (row.from_key, row.to_key): row.setup_minutes for row in state["setup_matrix"]
    }
    lateness = 0
    setup_total = 0
    change_count = 0
    utilization_per_wc = defaultdict(list)
    items = sorted(schedule.items, key=lambda item: (item.workcenter_id, item.start_ts))
    prev_item = {}
    for item in items:
        order = order_lookup.get(item.order_id)
        if order and item.end_ts > order.due_date:
            lateness += int((item.end_ts - order.due_date).total_seconds() // 60)
        wc_items = prev_item.get(item.workcenter_id)
        if wc_items:
            prev_order = order_lookup.get(wc_items.order_id)
            prev_key = (
                product_lookup.get(prev_order.product_code).setup_key
                if prev_order and product_lookup.get(prev_order.product_code)
                else prev_order.product_code if prev_order else None
            )
            current_key = (
                product_lookup.get(order.product_code).setup_key
                if order and product_lookup.get(order.product_code)
                else order.product_code if order else None
            )
            if prev_key and current_key and prev_key != current_key:
                change_count += 1
                setup_total += setup_matrix.get((prev_key, current_key), 0)
        prev_item[item.workcenter_id] = item
        utilization_per_wc[item.workcenter_id].append(
            int((item.end_ts - item.start_ts).total_seconds() // 60)
        )
    avg_utilization = 0.0
    if utilization_per_wc:
        avg_utilization = sum(sum(v) for v in utilization_per_wc.values()) / max(
            len(utilization_per_wc), 1
        )
    return KPI(
        total_lateness_min=lateness,
        total_setup_min=setup_total,
        change_count=change_count,
        avg_utilization=avg_utilization,
    )


def summary(schedule_id: int) -> KPI:
    state = load_state()
    if state["latest"] and state["latest"].get("schedule", {}).get("id") == schedule_id:
        schedule = state["latest"]
        draft = ScheduleDraft.parse_obj(schedule)
        return calculate_kpi(draft)
    raise ValueError("Schedule bulunamadı")
