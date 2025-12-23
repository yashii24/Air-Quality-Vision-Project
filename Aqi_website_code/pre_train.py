import pandas as pd
from preprocessing import preprocess_data
from modeling import train_model
from joblib import dump

# 1️⃣ Load FULL CSV (2017–2024, ALL stations)
df = pd.read_csv("air_quality.hourly_data.csv")

df.rename(columns={"timestamp": "Timestamp"}, inplace=True)

df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")

# Keep only recent data (recommended)
df = df[df["Timestamp"] >= "2023-01-01"]


# 2️⃣ Preprocess
df = preprocess_data(df)



# 3️⃣ Train model
results = train_model(df)

# 4️⃣ Save model + feature columns
dump(results["model"], "pm25_model.pkl")
dump(list(results["X_train"].columns), "feature_cols.pkl")

print("✅ Model trained on ALL stations (2017–2024) and saved")
