import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/axios";

const initialState = { profile: null, status: "idle", error: null };

export const fetchProviderProfile = createAsyncThunk(
  "provider/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/providers/me");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const providerSlice = createSlice({
  name: "provider",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProviderProfile.pending, (state) => { state.status = "loading"; })
      .addCase(fetchProviderProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchProviderProfile.rejected, (state, action) => {
        state.status = "failed"; state.error = action.payload;
      });
  },
});

export default providerSlice.reducer;
