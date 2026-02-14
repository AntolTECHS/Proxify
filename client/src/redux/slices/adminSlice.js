import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/* =========================
   API BASE (VITE SAFE)
========================= */
const API = import.meta.env.VITE_API_URL;

/* =========================
   Async Thunks
========================= */

// Fetch all users
export const fetchUsers = createAsyncThunk(
  "admin/fetchUsers",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const { data } = await axios.get(`${API}/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return data.users;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Fetch all providers
export const fetchProviders = createAsyncThunk(
  "admin/fetchProviders",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const { data } = await axios.get(`${API}/admin/providers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return data.providers;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Approve provider
export const approveProvider = createAsyncThunk(
  "admin/approveProvider",
  async (id, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const { data } = await axios.put(
        `${API}/admin/providers/${id}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data.provider;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Reject provider
export const rejectProvider = createAsyncThunk(
  "admin/rejectProvider",
  async ({ id, notes }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const { data } = await axios.put(
        `${API}/admin/providers/${id}/reject`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data.provider;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Fetch all bookings
export const fetchBookings = createAsyncThunk(
  "admin/fetchBookings",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const { data } = await axios.get(`${API}/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return data.bookings;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Update booking status
export const updateBookingStatus = createAsyncThunk(
  "admin/updateBookingStatus",
  async ({ id, status }, thunkAPI) => {
    try {
      const token = thunkAPI.getState().auth.token;

      const { data } = await axios.put(
        `${API}/admin/bookings/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return data.booking;
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
const adminSlice = createSlice({
  name: "admin",
  initialState: {
    users: [],
    providers: [],
    bookings: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // USERS
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // PROVIDERS
      .addCase(fetchProviders.fulfilled, (state, action) => {
        state.providers = action.payload;
      })
      .addCase(approveProvider.fulfilled, (state, action) => {
        const idx = state.providers.findIndex(p => p._id === action.payload._id);
        if (idx !== -1) state.providers[idx] = action.payload;
      })
      .addCase(rejectProvider.fulfilled, (state, action) => {
        const idx = state.providers.findIndex(p => p._id === action.payload._id);
        if (idx !== -1) state.providers[idx] = action.payload;
      })

      // BOOKINGS
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.bookings = action.payload;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const idx = state.bookings.findIndex(b => b._id === action.payload._id);
        if (idx !== -1) state.bookings[idx] = action.payload;
      });
  },
});

export default adminSlice.reducer;