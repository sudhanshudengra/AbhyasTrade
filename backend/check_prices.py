import yfinance as yf
import pandas as pd

symbols = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "TATAMOTORS.NS", "^NSEI", "^NSEBANK"]

for sym in symbols:
    try:
        t = yf.Ticker(sym)
        hist = t.history(period="5d", interval="5m")
        if not hist.empty:
            last_p = float(hist["Close"].iloc[-1])
            prev_p = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last_p
            print(f"{sym}: Real LTP = {last_p:.2f}, Prev = {prev_p:.2f}, Candles Count = {len(hist)}")
            # Print timestamp of first and last candle
            print(f"   First candle: {hist.index[0]}, Last candle: {hist.index[-1]}")
        else:
            print(f"{sym}: Empty data from yfinance")
    except Exception as e:
        print(f"{sym}: Error {e}")
