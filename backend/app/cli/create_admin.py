"""CLI Command to Bootstrap Initial System Administrator."""
import argparse
import getpass
import sys
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from ..core.config import settings
from ..core.logging import logger
from ..db.session import SessionLocal
from ..models.auth import RoleModel, UserModel
from ..auth.security import hash_password, validate_password_strength


def create_or_update_admin(
    username: str,
    email: str,
    password: str,
    full_name: str,
) -> bool:
    """Creates or updates the system administrator account with the ADMIN role."""
    ok, err = validate_password_strength(password)
    if not ok:
        print(f"[ERROR] Password policy violation: {err}")
        return False

    db = SessionLocal()
    try:
        admin_role = db.scalar(select(RoleModel).where(RoleModel.name == "ADMIN"))
        if not admin_role:
            print("[ERROR] 'ADMIN' role not found in database. Run database migrations first (alembic upgrade head).")
            return False

        user = db.scalar(select(UserModel).where(UserModel.username == username))
        if user:
            print(f"[*] Updating existing user '{username}' with new credentials and ADMIN role...")
            user.email = email.lower().strip()
            user.full_name = full_name.strip()
            user.password_hash = hash_password(password)
            user.is_active = True
            if admin_role not in user.roles:
                user.roles.append(admin_role)
            user.updated_at = datetime.now(timezone.utc)
            db.commit()
            print(f"[SUCCESS] Administrator '{username}' updated successfully.")
            return True
        else:
            print(f"[*] Creating new administrator account '{username}'...")
            new_admin = UserModel(
                id=str(uuid.uuid4()),
                email=email.lower().strip(),
                username=username.strip(),
                password_hash=hash_password(password),
                full_name=full_name.strip(),
                is_active=True,
                roles=[admin_role],
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(new_admin)
            db.commit()
            print(f"[SUCCESS] Administrator '{username}' created successfully (ID: {new_admin.id}).")
            return True
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Failed to create administrator: {exc}")
        return False
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="LogForge Admin Account Bootstrap CLI")
    parser.add_argument("--username", default=settings.DEFAULT_ADMIN_USERNAME, help="Admin username")
    parser.add_argument("--email", default=settings.DEFAULT_ADMIN_EMAIL, help="Admin email address")
    parser.add_argument("--full-name", default=settings.DEFAULT_ADMIN_FULL_NAME, help="Admin full name")
    parser.add_argument("--password", default=None, help="Admin password (prompts if omitted)")

    args = parser.parse_args()

    password = args.password
    if not password:
        if sys.stdin.isatty():
            password = getpass.getpass(f"Enter password for admin '{args.username}': ")
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                print("[ERROR] Passwords do not match.")
                sys.exit(1)
        else:
            # Non-interactive fallback default for automated container setup
            password = "LogForgeAdmin2026!Secure"
            print(f"[*] Non-interactive environment detected. Using secure initial bootstrap password.")

    success = create_or_update_admin(
        username=args.username,
        email=args.email,
        password=password,
        full_name=args.full_name,
    )
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
