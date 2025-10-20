"""Basit veri tohumlama scripti.

python -m backend.seed komutu ile çağrılabilir.
"""
from datetime import datetime, timedelta

from .models import Order, OrderStatus, Product, Role, SetupMatrixRow, User, WorkCenter
from .security import hash_password
from .storage import (
    ensure_files,
    load_state,
    save_orders,
    save_products,
    save_settings,
    save_setup_matrix,
    save_users,
    save_workcenters,
)


def run(seed_orders: bool = True) -> None:
    ensure_files()
    state = load_state()

    if not state["users"]:
        users = [
            User(id=1, name="Admin", email="admin@example.com", role=Role.admin, password_hash=hash_password("admin")),
            User(id=2, name="Satış", email="satis@example.com", role=Role.sales, password_hash=hash_password("satis")),
            User(id=3, name="Planlama", email="planlama@example.com", role=Role.planner, password_hash=hash_password("plan")),
            User(id=4, name="Üretim", email="uretim@example.com", role=Role.production, password_hash=hash_password("uretim")),
        ]
        save_users(users)

    if not state["products"]:
        products = [
            Product(code="P-100", name="Ürün 100", setup_key="A"),
            Product(code="P-200", name="Ürün 200", setup_key="B"),
            Product(code="P-300", name="Ürün 300", setup_key="C"),
        ]
        save_products(products)

    if not state["workcenters"]:
        workcenters = [
            WorkCenter(id=1, name="Hat 1", capacity_per_shift=100),
            WorkCenter(id=2, name="Hat 2", capacity_per_shift=80),
        ]
        save_workcenters(workcenters)

    if not state["setup_matrix"]:
        matrix = [
            SetupMatrixRow(from_key="A", to_key="B", setup_minutes=15),
            SetupMatrixRow(from_key="B", to_key="C", setup_minutes=20),
            SetupMatrixRow(from_key="C", to_key="A", setup_minutes=10),
        ]
        save_setup_matrix(matrix)

    if seed_orders and not state["orders"]:
        now = datetime.utcnow()
        orders = [
            Order(
                id=i + 1,
                product_code="P-100" if i % 2 == 0 else "P-200",
                quantity=10 + i * 5,
                due_date=now + timedelta(days=i + 1),
                priority=1,
                is_rush=False,
                status=OrderStatus.new,
                created_at=now,
            )
            for i in range(5)
        ]
        save_orders(orders)

    settings = state["settings"]
    settings.counters.setdefault("orders", len(state["orders"]) or 5)
    settings.counters.setdefault("schedule", 0)
    save_settings(settings)


if __name__ == "__main__":
    run()
