import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import providerReducer from "./slices/providerSlice";
import serviceReducer from "./slices/serviceSlice";
import bookingReducer from "./slices/bookingSlice";
import chatReducer from "./slices/chatSlice";
import discussionReducer from "./slices/discussionSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    provider: providerReducer,
    service: serviceReducer,
    booking: bookingReducer,
    chat: chatReducer,
    discussion: discussionReducer,
  },
});

export default store;
