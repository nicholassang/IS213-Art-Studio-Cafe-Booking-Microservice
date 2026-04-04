import React from "react";
import { createRoot } from "react-dom/client";
import { ApolloProvider } from "@apollo/client";
import App from "./App";
import { AuthProvider } from "../context/AuthContext";
import apolloClient from "../services/apolloClient";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ApolloProvider client={apolloClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ApolloProvider>
);