import pandas as pd
from pathlib import Path

out_dir = Path(__file__).resolve().parent

# Sample 2: Messy Customers Excel spreadsheet
customers_data = {
    " Customer_ID ": ["0010", "0025", "0033", "0048", "0025", "0059", "0062", "0071"],
    "Full Name": ["  alice cooper  ", "BOB DYLAN", "Charlie Puth", "David Bowie", "BOB DYLAN", "  eva green ", "Frank Ocean", None],
    "Signup_Date": ["2022-03-01", "01/03/2022", "March 2, 2022", "2022/03/05", "01/03/2022", "2022-03-08", None, "2022-03-12"],
    "Email": ["alice@cooper.com", "bob@dylan.org", "charlie@music.io", "david@bowie.com", "bob@dylan.org", "eva@cinema.fr", "frank@ocean.com", "unknown@test.com"],
    "Annual_Spend": ["$12,450.00", "$3,200.50", "$850.00", "$45,000.00", "$3,200.50", "$1,999.99", "$500.00", "$0.00"],
    "Active_Subscriber": ["yes", "YES", "no", "true", "YES", "false", "1", "0"],
    "Country_Region": ["  usa  ", "USA", "United States", "uk", "USA", "France", "  USA  ", "Canada"]
}

df_customers = pd.DataFrame(customers_data)
excel_path = out_dir / "messy_customers.xlsx"
with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
    df_customers.to_excel(writer, index=False, sheet_name="Customers")

print(f"Generated {excel_path} successfully.")
