"""Seed script for TiDB Cloud (MySQL-compatible). Reads credentials from env vars."""
import pandas as pd
import sqlalchemy as sa
import os


def seed_tidb():
    """Upload sample banking CSVs to a remote TiDB Cloud instance."""
    user = os.environ["TIDB_USER"]
    password = os.environ["TIDB_PASSWORD"]
    host = os.environ["TIDB_HOST"]
    port = int(os.environ.get("TIDB_PORT", "4000"))
    database = os.environ.get("TIDB_DATABASE", "fortune500")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_data_dir = os.path.join(root_dir, "..", "sample_data")

    conn_str = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
    print(f"Connecting to remote TiDB at {host} (with SSL)...")

    try:
        engine = sa.create_engine(
            conn_str,
            connect_args={"ssl": {"verify_identity": True}}
        )

        # Cleanup old tables
        with engine.connect() as conn:
            print("  Cleaning up old tables...")
            conn.execute(sa.text("DROP TABLE IF EXISTS employees"))
            conn.execute(sa.text("DROP TABLE IF EXISTS sales_data"))
            conn.commit()

        files = {
            "loan_portfolio": os.path.join(sample_data_dir, "loan_portfolio.csv"),
        }

        for table_name, file_path in files.items():
            if os.path.exists(file_path):
                print(f"  Uploading {table_name}...")
                df = pd.read_csv(file_path)
                df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
                df.to_sql(table_name, engine, if_exists='replace', index=False)
            else:
                print(f"  Warning: {file_path} not found.")

        print("TiDB refresh complete!")

    except Exception as e:
        print(f"Error during seeding: {e}")


if __name__ == "__main__":
    seed_tidb()
