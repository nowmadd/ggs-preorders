import { configureStore } from "@reduxjs/toolkit";
import { itemsApi } from "./api/itemsApi";
import { offersApi } from "./api/offersApi";
import { gamesApi } from "./api/gamesApi";
import uiReducer from "./uiSlice";
import { preordersApi } from "./api/preordersApi";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [itemsApi.reducerPath]: itemsApi.reducer,
    [offersApi.reducerPath]: offersApi.reducer,
    [gamesApi.reducerPath]: gamesApi.reducer,
    [preordersApi.reducerPath]: preordersApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      itemsApi.middleware,
      offersApi.middleware,
      gamesApi.middleware,
      preordersApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
