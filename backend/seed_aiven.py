"""Seed script for remote MySQL (Aiven). Reads credentials from env vars."""
import pandas as pd
import sqlalchemy as sa
import os


def seed_remote_mysql():
    """Upload sample banking CSVs to a remote MySQL instance."""
    user = os.environ["MYSQL_USER"]
    password = os.environ["MYSQL_PASSWORD"]
    host = os.environ["MYSQL_HOST"]
    port = int(os.environ.get("MYSQL_PORT", "25235"))
    database = os.environ.get("MYSQL_DATABASE", "defaultdb")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_data_dir = os.path.join(root_dir, "..", "sample_data")

    conn_str = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
    print(f"Connecting to remote MySQL at {host} (with SSL)...")

    try:
        engine = sa.create_engine(
            conn_str,
            connect_args={"ssl": {"verify_identity": True}}
        )

        files = {
            "employees": os.path.join(sample_data_dir, "employees.csv"),
            "sales_data": os.path.join(sample_data_dir, "sales_data.csv")
        }

        for table_name, file_path in files.items():
            if os.path.exists(file_path):
                print(f"  Uploading {table_name}...")
                df = pd.read_csv(file_path)
                df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
                df.to_sql(table_name, engine, if_exists='replace', index=False)
            else:
                print(f"  Warning: {file_path} not found.")

        print("Remote seeding complete!")

    except Exception as e:
        print(f"Error during seeding: {e}")


if __name__ == "__main__":
    seed_remote_mysql()
