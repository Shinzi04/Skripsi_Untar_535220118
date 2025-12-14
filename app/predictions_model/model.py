import base64
import json
import os
from io import BytesIO
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import joblib
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    mean_squared_error,
    r2_score,
    root_mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler

# ? https://stackoverflow.com/questions/77921357/warning-while-using-tensorflow-tensorflow-core-util-port-cc113-onednn-custom
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import keras
import tensorflow as tf
from keras.callbacks import EarlyStopping
from keras.layers import LSTM, Bidirectional, Dense, Dropout
from keras.optimizers import Adam

keras.utils.set_random_seed(42)
tf.random.set_seed(42)

# ? https://github.com/microsoft/pylance-release/issues/5482
from keras.models import Sequential

BASE_DIR = Path(__file__).resolve().parent

poluttants = ["PM10", "SO2", "CO", "O3", "NO2"]
meteorology = [
    "Temperatur",
    "Kelembapan",
    "Curah Hujan",
    "Penyinaran Matahari",
    "Kecepatan Angin",
]


import pandas as pd


def preprocess_data(df: pd.DataFrame):
    df = df.copy()
    df["Tanggal"] = pd.to_datetime(df["Tanggal"])
    df = df.sort_values("Tanggal")

    # ? FIXING 0S AND NAN THEN INTEPOLATE
    df[poluttants] = df[poluttants].replace(0, np.nan)
    df.interpolate(method="linear", inplace=True, limit_direction="both")
    return df


def make_sequences(X, y, time_step=7):
    Xs, ys = [], []
    for i in range(len(X) - time_step):
        Xs.append(X[i : i + time_step])
        ys.append(y[i + time_step])
    return np.array(Xs), np.array(ys)


def build_model(
    input_steps, n_features, n_targets, dropout=0.2, lstm_units=128, learning_rate=0.001
):
    optimizer = Adam(learning_rate=learning_rate)
    
    model = Sequential(name="Prediksi_Polutan")
    model.add(Bidirectional(LSTM(lstm_units), input_shape=(input_steps, n_features)))
    model.add(Dropout(dropout))
    model.add(Dense(n_targets))
    model.compile(optimizer=optimizer, loss="huber", metrics=["accuracy"])
    model.summary()
    return model


def evaluate_model(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    return mae, mape, mse, rmse, r2


def train_model(
    df: pd.DataFrame,
    time_step=7,
    batch_size=64,
    epochs=200,
    validation_split=0.2,
    patience=10,
    learning_rate=0.001,
    dropout=0.2,
    lstm_units=128,
    test_size=0.2,
    model_name="prediction_model",
):
    df = preprocess_data(df)
    df_idx = df.set_index("Tanggal")

    features = poluttants + meteorology
    targets = poluttants

    X = df[features].values
    y = df[targets].values

    # SPLIT DATA
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, shuffle=False
    )

    # NORMALIZATION
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()

    X_train_scaled = scaler_X.fit_transform(X_train)
    X_test_scaled = scaler_X.transform(X_test)

    y_train_scaled = scaler_y.fit_transform(y_train)
    y_test_scaled = scaler_y.transform(y_test)

    # SEQUENCES
    Xtr, ytr = make_sequences(X_train_scaled, y_train_scaled, time_step)
    Xte, yte = make_sequences(X_test_scaled, y_test_scaled, time_step)

    # MODEL
    model = build_model(
        input_steps=time_step,
        n_features=Xtr.shape[2],
        n_targets=ytr.shape[1],
        dropout=dropout,
        lstm_units=lstm_units,
        learning_rate=learning_rate,
    )
    es = EarlyStopping(monitor="val_loss", patience=patience, restore_best_weights=True)
    model.fit(
        Xtr,
        ytr,
        epochs=epochs,
        batch_size=batch_size,
        validation_split=validation_split,
        callbacks=[es],
        verbose=1,
        shuffle=False,
    )
    prediction_results_n = model.predict(Xte, verbose=0)
    prediction_result = scaler_y.inverse_transform(prediction_results_n)
    ytrue = scaler_y.inverse_transform(yte)

    # PRINT EVALUATION
    metrics = {}
    for i, col in enumerate(poluttants):
        mae, mape, mse, rmse, r2 = evaluate_model(ytrue[:, i], prediction_result[:, i])
        metrics[col] = {
            "MAE": float(mae),
            "MAPE": float(mape),
            "MSE": float(mse),
            "RMSE": float(rmse),
            "R2": float(r2),
        }
        print(
            f"{col:>5} | MAE={mae:.3f} | MAPE={mape:.2f}% | MSE={mse:.3f} | RMSE={rmse:.3f} | R²={r2:.3f}"
        )

    # OVERALL METRICS
    metrics["Overall"] = {
        k: float(np.mean([metrics[c][k] for c in poluttants]))
        for k in ["MAE", "MAPE", "MSE", "RMSE", "R2"]
    }

    # SAVE MODEL
    print("Saving model...")
    SAVE_DIR = Path(BASE_DIR / "models" / model_name)
    os.makedirs(SAVE_DIR, exist_ok=True)
    print(SAVE_DIR)

    model.save(SAVE_DIR / "bilstm_model.keras")
    joblib.dump(scaler_X, SAVE_DIR / "scaler_X.joblib")
    joblib.dump(scaler_y, SAVE_DIR / "scaler_y.joblib")
    with open(SAVE_DIR / "metadata.json", "w") as f:
        json.dump(
            {"time_step": time_step, "features": features, "targets": poluttants}, f
        )

    with open(SAVE_DIR / "evaluation.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    hist_feats = df_idx[features].copy()
    hist_feats = hist_feats.apply(pd.to_numeric, errors="coerce")

    seed_window = hist_feats.iloc[-time_step:].copy()
    if seed_window.isna().any().any():
        bad_cols = seed_window.columns[seed_window.isna().any()].tolist()
        raise ValueError(f"Seed window contains NaNs. Affected columns: {bad_cols}")

    seed_path_csv = SAVE_DIR / "seed_window.csv"
    seed_window.to_csv(seed_path_csv, index=True)
