"""Seed script for Supabase (PostgreSQL). Reads credentials from env vars."""
import pandas as pd
import sqlalchemy as sa
import os


def seed_supabase():
    """Upload sample banking CSVs to a remote Supabase instance."""
    user = os.environ["SUPABASE_USER"]
    password = os.environ["SUPABASE_PASSWORD"]
    host = os.environ["SUPABASE_HOST"]
    port = int(os.environ.get("SUPABASE_PORT", "5432"))
    database = os.environ.get("SUPABASE_DATABASE", "postgres")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_data_dir = os.path.join(root_dir, "..", "sample_data")

    conn_str = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}?sslmode=require"
    print(f"Connecting to remote Supabase at {host} (with SSL)...")

    try:
        engine = sa.create_engine(conn_str)

        # Cleanup old tables
        with engine.connect() as conn:
            print("  Cleaning up old tables...")
            conn.execute(sa.text("DROP TABLE IF EXISTS employees CASCADE"))
            conn.execute(sa.text("DROP TABLE IF EXISTS sales_data CASCADE"))
            conn.commit()

        files = {
            "bank_transactions": os.path.join(sample_data_dir, "bank_transactions.csv"),
            "customer_accounts": os.path.join(sample_data_dir, "customer_accounts.csv")
        }

        for table_name, file_path in files.items():
            if os.path.exists(file_path):
                print(f"  Uploading {table_name}...")
                df = pd.read_csv(file_path)
                df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
                df.to_sql(table_name, engine, if_exists='replace', index=False)
            else:
                print(f"  Warning: {file_path} not found.")

        print("Supabase refresh complete!")

    except Exception as e:
        print(f"Error during seeding: {e}")


if __name__ == "__main__":
    seed_supabase()
