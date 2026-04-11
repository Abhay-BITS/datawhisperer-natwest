import pandas as pd
import sqlalchemy as sa
import os

def init_demo_db():
    # Paths assuming script runs from backend/ directory or root
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_data_dir = os.path.join(root_dir, "..", "sample_data")
    db_path = os.path.join(root_dir, "demo.db")
    
    print(f"Generating demo database at {db_path}...")
    
    engine = sa.create_engine(f"sqlite:///{db_path}")
    
    # Files to convert
    files = {
        "employees": os.path.join(sample_data_dir, "employees.csv"),
        "sales_data": os.path.join(sample_data_dir, "sales_data.csv")
    }
    
    for table_name, file_path in files.items():
        if os.path.exists(file_path):
            print(f"  Importing {table_name} from {file_path}...")
            df = pd.read_csv(file_path)
            # Clean column names (replace spaces with underscores)
            df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
            df.to_sql(table_name, engine, if_exists='replace', index=False)
        else:
            print(f"  Warning: {file_path} not found. Skipping.")
            
    print("Demo database initialization complete.")

if __name__ == "__main__":
    init_demo_db()
