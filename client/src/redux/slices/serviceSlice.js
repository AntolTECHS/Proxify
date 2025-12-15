import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/axios";

const initialState = { services: [], status: "idle", error: null };

export const fetchServices = createAsyncThunk(
  "service/fetchServices",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/services");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const serviceSlice = createSlice({
  name: "service",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => { state.status = "loading"; })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.status = "failed"; state.error = action.payload;
      });
  },
});

export default serviceSlice.reducer;
