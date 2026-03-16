"""Seed the database with demo data for RealDeal AI."""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

# Must set env before imports
import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./realdeal_dev.db")
os.environ.setdefault("JWT_SECRET", "dev-secret")

from app.core.database import async_session_factory, engine
from app.core.security import hash_password
from app.models.base import Base
from app.models.user import User
from app.models.property import Property
from app.models.unit import Unit
from app.models.tenant import Tenant
from app.models.lease import Lease
from app.models.payment import Payment
from app.models.contractor import Contractor
from app.models.lease import LeaseType, LeaseStatus
from app.models.payment import PaymentType, PaymentMethod, PaymentStatus


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # ---- Landlord ----
        landlord = User(
            id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            email="jordan@mitchell.com",
            hashed_password=hash_password("demo123"),
            full_name="Jordan Mitchell",
            company_name="Mitchell Properties LLC",
            plan_tier="growth",
        )
        db.add(landlord)
        lid = landlord.id

        # ---- Properties ----
        p1 = Property(
            id=uuid.UUID("aaaa1111-1111-1111-1111-111111111111"),
            landlord_id=lid, name="Maple Street Apartments",
            address_line1="742 Maple St", city="Portland", state="OR", zip_code="97201",
            property_type="multi", total_units=12,
            purchase_price=2400000, current_value=2800000,
            mortgage_payment=9800, insurance_cost=850, tax_annual=28000,
        )
        p2 = Property(
            id=uuid.UUID("aaaa2222-2222-2222-2222-222222222222"),
            landlord_id=lid, name="Oak Park Townhomes",
            address_line1="1200 Oak Park Dr", city="Portland", state="OR", zip_code="97205",
            property_type="townhouse", total_units=8,
            purchase_price=1600000, current_value=1900000,
            mortgage_payment=6500, insurance_cost=600, tax_annual=19000,
        )
        p3 = Property(
            id=uuid.UUID("aaaa3333-3333-3333-3333-333333333333"),
            landlord_id=lid, name="Cedar Heights Condo",
            address_line1="890 Cedar Heights Way", city="Lake Oswego", state="OR", zip_code="97034",
            property_type="condo", total_units=4,
            purchase_price=850000, current_value=980000,
            mortgage_payment=3400, insurance_cost=350, tax_annual=10500,
        )
        db.add_all([p1, p2, p3])
        await db.flush()

        # ---- Units + Tenants + Leases ----
        tenants_data = [
            ("James", "Smith", "james.smith@email.com", "(503) 555-0201"),
            ("Maria", "Garcia", "maria.garcia@email.com", "(503) 555-0202"),
            ("David", "Johnson", "david.j@email.com", "(503) 555-0203"),
            ("Sarah", "Williams", "sarah.w@email.com", "(503) 555-0204"),
            ("Michael", "Brown", "m.brown@email.com", "(503) 555-0205"),
            ("Jennifer", "Davis", "jen.davis@email.com", "(503) 555-0206"),
            ("Robert", "Miller", "r.miller@email.com", "(503) 555-0207"),
            ("Lisa", "Wilson", "lisa.w@email.com", "(503) 555-0208"),
            ("Kevin", "Moore", "k.moore@email.com", "(503) 555-0209"),
            ("Amanda", "Taylor", "a.taylor@email.com", "(503) 555-0210"),
            ("Chris", "Anderson", "c.anderson@email.com", "(503) 555-0211"),
            ("Emily", "Thomas", "e.thomas@email.com", "(503) 555-0212"),
            ("Daniel", "Jackson", "d.jackson@email.com", "(503) 555-0213"),
            ("Rachel", "White", "r.white@email.com", "(503) 555-0214"),
            ("Josh", "Harris", "j.harris@email.com", "(503) 555-0215"),
            ("Stephanie", "Martin", "s.martin@email.com", "(503) 555-0216"),
            ("Brian", "Thompson", "b.thompson@email.com", "(503) 555-0217"),
            ("Nicole", "Robinson", "n.robinson@email.com", "(503) 555-0218"),
            ("Tyler", "Clark", "t.clark@email.com", "(503) 555-0219"),
            ("Megan", "Lewis", "m.lewis@email.com", "(503) 555-0220"),
            ("Andrew", "Lee", "a.lee@email.com", "(503) 555-0221"),
            ("Ashley", "Walker", "a.walker@email.com", "(503) 555-0222"),
        ]

        units_config = [
            # (property, unit_num, beds, baths, sqft, rent, occupied)
            (p1, "1A", 1, 1, 650, 1350, True),
            (p1, "1B", 1, 1, 650, 1350, True),
            (p1, "2A", 2, 1, 850, 1650, True),
            (p1, "2B", 2, 1, 850, 1650, True),
            (p1, "3A", 2, 2, 950, 1800, True),
            (p1, "3B", 2, 2, 950, 1800, True),
            (p1, "4A", 3, 2, 1100, 2100, True),
            (p1, "4B", 3, 2, 1100, 2100, True),
            (p1, "5A", 1, 1, 600, 1300, True),
            (p1, "5B", 1, 1, 600, 1300, True),
            (p1, "6A", 2, 1, 800, 1600, True),
            (p1, "6B", 2, 1, 800, 1600, False),  # vacant
            (p2, "101", 2, 2, 1200, 1900, True),
            (p2, "102", 2, 2, 1200, 1900, True),
            (p2, "103", 3, 2, 1400, 2200, True),
            (p2, "104", 3, 2, 1400, 2200, True),
            (p2, "105", 2, 2, 1200, 1900, True),
            (p2, "106", 2, 2, 1200, 1900, True),
            (p2, "107", 3, 2, 1400, 2200, True),
            (p2, "108", 3, 2, 1400, 2200, False),  # vacant
            (p3, "A", 2, 2, 1100, 2000, True),
            (p3, "B", 2, 2, 1100, 2000, True),
            (p3, "C", 3, 2, 1300, 2400, True),
            (p3, "D", 3, 2, 1300, 2400, True),
        ]

        tenant_idx = 0
        now = datetime.now(timezone.utc)
        today = date.today()

        for prop, unum, beds, baths, sqft, rent, occupied in units_config:
            unit = Unit(
                property_id=prop.id, unit_number=unum,
                bedrooms=beds, bathrooms=baths, sqft=sqft,
                market_rent=rent, status="occupied" if occupied else "vacant",
            )
            db.add(unit)
            await db.flush()

            if occupied and tenant_idx < len(tenants_data):
                td = tenants_data[tenant_idx]
                tenant = Tenant(
                    landlord_id=lid,
                    first_name=td[0], last_name=td[1],
                    email=td[2], phone=td[3],
                    is_active=True, portal_enabled=True,
                )
                db.add(tenant)
                await db.flush()

                lease = Lease(
                    unit_id=unit.id, tenant_id=tenant.id,
                    rent_amount=rent, deposit_amount=rent,
                    start_date=today - timedelta(days=180),
                    end_date=today + timedelta(days=185),
                    rent_due_day=1, late_fee_amount=50,
                    late_fee_grace_days=5,
                    lease_type=LeaseType.FIXED, status=LeaseStatus.ACTIVE,
                )
                db.add(lease)
                await db.flush()

                # Create payment for this month (most paid, some outstanding)
                paid = tenant_idx not in [3, 7]  # Sarah Williams and Lisa Wilson are late
                payment = Payment(
                    lease_id=lease.id, tenant_id=tenant.id,
                    amount=rent, payment_type=PaymentType.RENT,
                    payment_method=PaymentMethod.ACH if paid else None,
                    status=PaymentStatus.COMPLETED if paid else PaymentStatus.PENDING,
                    due_date=today.replace(day=1),
                    paid_date=now - timedelta(days=2) if paid else None,
                )
                db.add(payment)

                tenant_idx += 1

        # ---- Contractors ----
        contractors = [
            Contractor(landlord_id=lid, company_name="ABC Plumbing", contact_name="Mike Chen",
                       phone="(503) 555-0301", email="mike@abcplumbing.com", trades="plumbing",
                       avg_rating=4.8, total_jobs=23, is_active=True),
            Contractor(landlord_id=lid, company_name="QuickFix Plumbing", contact_name="Tom Reed",
                       phone="(503) 555-0302", email="tom@quickfix.com", trades="plumbing",
                       avg_rating=4.5, total_jobs=15, is_active=True),
            Contractor(landlord_id=lid, company_name="Portland Electric Co", contact_name="Dave Park",
                       phone="(503) 555-0303", email="dave@pdxelectric.com", trades="electrical",
                       avg_rating=4.9, total_jobs=31, is_active=True),
            Contractor(landlord_id=lid, company_name="Rose City HVAC", contact_name="Sandra Kim",
                       phone="(503) 555-0304", email="sandra@rosecityhvac.com", trades="hvac",
                       avg_rating=4.7, total_jobs=18, is_active=True),
            Contractor(landlord_id=lid, company_name="All-Around Handyman", contact_name="Jake Torres",
                       phone="(503) 555-0305", email="jake@allroundhandyman.com", trades="general",
                       avg_rating=4.6, total_jobs=42, is_active=True),
        ]
        db.add_all(contractors)

        # Note: maintenance requests skipped in seed (require valid unit_id/tenant_id FKs)
        # They'll show as mock data in the frontend

        await db.commit()
        print("Demo data seeded successfully!")
        print(f"  Landlord: jordan@mitchell.com / demo123")
        print(f"  Properties: 3")
        print(f"  Units: 24 (22 occupied)")
        print(f"  Tenants: 22")
        print(f"  Contractors: 5")
        print(f"  Maintenance requests: 3")


if __name__ == "__main__":
    asyncio.run(seed())
