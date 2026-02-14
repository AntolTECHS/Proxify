// src/redux/slices/customerSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================
   Helper: Auth Header
========================= */
const authHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

/* =========================
   Async Thunks
========================= */

// Fetch bookings for logged-in customer
export const fetchBookings = createAsyncThunk(
  "customer/fetchBookings",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(
        `${API}/bookings/my`,
        authHeader()
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Fetch all providers
export const fetchProviders = createAsyncThunk(
  "customer/fetchProviders",
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${API}/providers`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// ✅ CREATE BOOKING (FIXES YOUR VITE ERROR)
export const createBooking = createAsyncThunk(
  "customer/createBooking",
  async (bookingData, thunkAPI) => {
    try {
      const response = await axios.post(
        `${API}/bookings`,
        bookingData,
        authHeader()
      );
      return response.data;
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
const customerSlice = createSlice({
  name: "customer",
  initialState: {
    bookings: [],
    providers: [],
    loading: false,
    error: null,
  },

  reducers: {
    clearCustomerData: (state) => {
      state.bookings = [];
      state.providers = [];
      state.loading = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ---------- FETCH BOOKINGS ---------- */
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- FETCH PROVIDERS ---------- */
      .addCase(fetchProviders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProviders.fulfilled, (state, action) => {
        state.loading = false;
        state.providers = action.payload;
      })
      .addCase(fetchProviders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ---------- CREATE BOOKING ---------- */
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.push(action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

/* =========================
   Exports
========================= */
export const { clearCustomerData } = customerSlice.actions;
export default customerSlice.reducer;
