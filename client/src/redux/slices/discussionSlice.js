import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api/axios";

const initialState = { discussions: [], status: "idle", error: null };

export const fetchDiscussions = createAsyncThunk(
  "discussion/fetchDiscussions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/discussions");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const discussionSlice = createSlice({
  name: "discussion",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscussions.pending, (state) => { state.status = "loading"; })
      .addCase(fetchDiscussions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.discussions = action.payload;
      })
      .addCase(fetchDiscussions.rejected, (state, action) => {
        state.status = "failed"; state.error = action.payload;
      });
  },
});

export default discussionSlice.reducer;
