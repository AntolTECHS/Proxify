// src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/* =========================
   API BASE (Vite-safe)
========================= */
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================
   Async Thunks
========================= */

// Login user
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, thunkAPI) => {
    try {
      const { data } = await axios.post(`${API}/auth/login`, credentials);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, thunkAPI) => {
    try {
      const { data } = await axios.post(`${API}/auth/register`, userData);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Upgrade user to provider
export const upgradeToProvider = createAsyncThunk(
  "auth/upgradeToProvider",
  async (formData, thunkAPI) => {
    try {
      const { data } = await axios.post(`${API}/providers/onboard`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

/* =========================
   Slice
========================= */
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    providerOnboarding: {
      status: "not_started",
      step: 0,
      data: {
        services: [],
        availability: "",
        documentsMeta: [], // only metadata, NOT File objects
      },
    },
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.error = null;
      state.providerOnboarding = {
        status: "not_started",
        step: 0,
        data: { services: [], availability: "", documentsMeta: [] },
      };
    },
    setProviderStep: (state, action) => {
      state.providerOnboarding.step = action.payload;
      state.providerOnboarding.status = "in_progress";
    },
    setProviderData: (state, action) => {
      state.providerOnboarding.data = {
        ...state.providerOnboarding.data,
        ...action.payload,
      };
    },
    resetProviderOnboarding: (state) => {
      state.providerOnboarding = {
        status: "not_started",
        step: 0,
        data: { services: [], availability: "", documentsMeta: [] },
      };
    },
  },
  extraReducers: (builder) => {
    builder
      /* ---------- LOGIN ---------- */
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- REGISTER ---------- */
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- UPGRADE TO PROVIDER ---------- */
      .addCase(upgradeToProvider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(upgradeToProvider.fulfilled, (state) => {
        state.loading = false;
        state.providerOnboarding.status = "pending";
        state.providerOnboarding.step = 0;
        if (state.user) {
          state.user.role = "provider";
          state.user.isVerified = false;
        }
      })
      .addCase(upgradeToProvider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

/* =========================
   Exports
========================= */
export const {
  logout,
  setProviderStep,
  setProviderData,
  resetProviderOnboarding,
} = authSlice.actions;

export default authSlice.reducer;