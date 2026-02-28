import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

/* =========================
   API BASE
========================= */
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================
   Persistence
========================= */
const storedUser = localStorage.getItem("user");
const storedToken = localStorage.getItem("token");

/* =========================
   Async Thunks
========================= */

// LOGIN
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, thunkAPI) => {
    try {
      const { data } = await axios.post(`${API}/auth/login`, credentials);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Login failed"
      );
    }
  }
);

// REGISTER
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, thunkAPI) => {
    try {
      const { data } = await axios.post(`${API}/auth/register`, userData);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Registration failed"
      );
    }
  }
);

// UPGRADE TO PROVIDER
export const upgradeToProvider = createAsyncThunk(
  "auth/upgradeToProvider",
  async (formDataObj, thunkAPI) => {
    try {
      const { token } = thunkAPI.getState().auth;

      const formData = new FormData();

      // Flatten providerName & email for backend
      const { basicInfo = {} } = formDataObj;
      const { providerName, email, ...otherBasicInfo } = basicInfo;

      if (!providerName || !email) {
        return thunkAPI.rejectWithValue("Provider name and email are required");
      }

      formData.append("providerName", providerName);
      formData.append("email", email);
      formData.append("basicInfo", JSON.stringify(otherBasicInfo || {}));

      // Services & availability
      formData.append("services", JSON.stringify(formDataObj.services || []));
      formData.append("servicesDescription", formDataObj.servicesDescription || "");
      formData.append("availability", JSON.stringify(formDataObj.availability || {}));

      // Documents text
      if (formDataObj.documentsText) {
        formData.append("documentsText", formDataObj.documentsText);
      }

      // Attach files
      if (formDataObj.documents && formDataObj.documents.length > 0) {
        formDataObj.documents.forEach((doc) => {
          if (doc.file instanceof File) formData.append("files", doc.file);
        });
      }

      const { data } = await axios.post(`${API}/providers/onboard`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      return data.user;
    } catch (error) {
      console.error("Provider onboarding failed:", error);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Provider upgrade failed"
      );
    }
  }
);

/* =========================
   Initial State
========================= */
const initialProviderData = {
  basicInfo: {},
  services: [],
  servicesDescription: "",
  availability: {},
  documents: [],
  documentsText: "",
};

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  isLoading: false,
  error: null,
  providerOnboarding: {
    status: "not_started",
    step: 0,
    data: initialProviderData,
  },
};

/* =========================
   Slice
========================= */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      state.providerOnboarding = {
        status: "not_started",
        step: 0,
        data: initialProviderData,
      };
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    },

    clearAuthError: (state) => {
      state.error = null;
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
        data: initialProviderData,
      };
    },
  },

  extraReducers: (builder) => {
    builder
      // LOGIN
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.setItem("token", state.token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // REGISTER
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem("user", JSON.stringify(state.user));
        localStorage.setItem("token", state.token);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // UPGRADE TO PROVIDER
      .addCase(upgradeToProvider.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(upgradeToProvider.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.providerOnboarding.status = "submitted";

        state.user = {
          ...state.user,
          ...action.payload,
          role: "provider",
          providerStatus: "pending",
          isVerified: false,
        };

        localStorage.setItem("user", JSON.stringify(state.user));
      })
      .addCase(upgradeToProvider.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

/* =========================
   Exports
========================= */
export const {
  logout,
  clearAuthError,
  setProviderStep,
  setProviderData,
  resetProviderOnboarding,
} = authSlice.actions;

export default authSlice.reducer;