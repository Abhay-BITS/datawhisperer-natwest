"""Seed script for Turso (libSQL). Reads credentials from env vars."""
import pandas as pd
import sqlalchemy as sa
import os


def seed_turso():
    """Upload sample banking CSVs to a remote Turso instance."""
    host = os.environ["TURSO_HOST"]
    token = os.environ["TURSO_AUTH_TOKEN"]

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_data_dir = os.path.join(root_dir, "..", "sample_data")

    conn_str = f"sqlite+libsql://{host}/?secure=true"
    print(f"Connecting to remote Turso at {host}...")

    try:
        engine = sa.create_engine(
            conn_str,
            connect_args={"auth_token": token}
        )

        # Cleanup old tables
        with engine.connect() as conn:
            print("  Cleaning up old tables...")
            conn.execute(sa.text("DROP TABLE IF EXISTS employees"))
            conn.execute(sa.text("DROP TABLE IF EXISTS sales_data"))
            conn.commit()

        files = {
            "fraud_alerts": os.path.join(sample_data_dir, "fraud_alerts.csv"),
        }

        for table_name, file_path in files.items():
            if os.path.exists(file_path):
                print(f"  Uploading {table_name} to Turso...")
                df = pd.read_csv(file_path)
                df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
                df.to_sql(table_name, engine, if_exists='replace', index=False)
            else:
                print(f"  Warning: {file_path} not found.")

        print("Turso refresh complete!")

    except Exception as e:
        print(f"Error during seeding: {e}")
        print("\nTIP: Make sure you have the required driver installed:")
        print("pip install sqlalchemy-libsql")


if __name__ == "__main__":
    seed_turso()
